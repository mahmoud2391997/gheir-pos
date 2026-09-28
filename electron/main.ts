import crypto from "node:crypto";
import fs from "node:fs";
import { createServer, type Server as HttpServer } from "node:http";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  session,
  shell,
  type WebContents,
} from "electron";
import { autoUpdater } from "electron-updater";
import express from "express";
import { COOKIE_NAME } from "../shared/const";
import { createApp as createApiApp } from "../server/_core/app";
import { countPendingSales, getDb } from "./inventory/db";
import {
  enqueueSaleFromRenderer,
  fetchPosStatus,
  getProducts,
  startSyncWorker,
  stopSyncWorker,
  syncPending,
} from "./inventory/sync";
import { loadSecrets, secretsConfigured } from "./secrets";

loadEnv();

// esbuild CJS output provides __dirname for the compiled bundle location (dist-electron/).
declare const __dirname: string;

const isDev = !app.isPackaged;

if (process.platform === "win32") {
  app.setAppUserModelId("com.gheir.pos");
}

function isHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function denyBlankWindowOpens(contents: WebContents) {
  contents.setWindowOpenHandler(({ url }) => {
    // http(s) links leave the app. about:blank stays inside Electron so
    // Windows is never asked to open an app named "about".
    if (isHttpUrl(url)) {
      void shell.openExternal(url).catch(() => undefined);
      return { action: "deny" };
    }
    if (!url || url === "about:blank") return { action: "allow" };
    return { action: "deny" };
  });
}

function withPrintBar(documentHtml: string) {
  const bar = `<style>
.gheir-print-bar{position:sticky;top:0;z-index:20;display:flex;justify-content:flex-end;gap:8px;padding:10px 12px;background:#2f3e34;font-family:Arial,sans-serif}
.gheir-print-bar button{border:0;border-radius:10px;padding:8px 16px;font-size:14px;font-weight:700;cursor:pointer}
.gheir-print-bar .print{background:#f2ead8;color:#2f3e34}
.gheir-print-bar .close{background:transparent;color:#f2ead8}
@media print{.gheir-print-bar{display:none!important}}
</style>
<div class="gheir-print-bar">
<button class="print" type="button" onclick="window.print()">Print · طباعة</button>
<button class="close" type="button" onclick="if(window.gheirPrintPreview){window.gheirPrintPreview.close()}else{window.close()}">Close · إغلاق</button>
</div>`;
  if (/<body[^>]*>/i.test(documentHtml)) {
    return documentHtml.replace(/<body([^>]*)>/i, `<body$1>${bar}`);
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${bar}${documentHtml}</body></html>`;
}

function resolveAppIcon() {
  const candidates = [
    path.join(process.resourcesPath, "icon.png"),
    path.join(__dirname, "../electron/assets/icon.png"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const image = nativeImage.createFromPath(file);
    if (!image.isEmpty()) return image;
  }
  return undefined;
}

function ensureLocalJwtSecret() {
  const current = String(process.env.JWT_SECRET || "");
  const placeholder = /replace-with|change-me|changeme|example/i.test(current);
  if (current.length >= 32 && !placeholder) return;
  const file = path.join(app.getPath("userData"), "register-secret");
  let next = "";
  try {
    next = fs.readFileSync(file, "utf8").trim();
  } catch {
    next = "";
  }
  if (next.length < 32 || /replace-with|change-me|changeme|example/i.test(next)) {
    next = crypto.randomBytes(32).toString("hex");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, next, { encoding: "utf8", mode: 0o600 });
    try {
      fs.chmodSync(file, 0o600);
    } catch {
      // mode is best-effort on platforms that ignore chmod
    }
  }
  process.env.JWT_SECRET = next;
}
let mainWindow: BrowserWindow | null = null;
let localServer: HttpServer | null = null;
let localServerUrl: string | null = null;

function readDesktopStore(): Record<string, string> {
  const file = path.join(app.getPath("userData"), "gheir-store.json");
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, string] =>
        typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}

function writeDesktopStoreKey(key: string, value: string | null) {
  if (!key.startsWith("gheir-")) return false;
  const file = path.join(app.getPath("userData"), "gheir-store.json");
  const store = readDesktopStore();
  if (value == null) delete store[key];
  else store[key] = value;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store), "utf8");
  return true;
}

function setupAutoUpdate() {
  if (isDev) return;
  if (process.env.DISABLE_AUTO_UPDATE === "1") return;

  autoUpdater.on("error", error => writeMainLog("auto_update_error", error));
  autoUpdater.on("checking-for-update", () =>
    writeMainLog("auto_update_checking", "checking")
  );
  autoUpdater.on("update-available", info =>
    writeMainLog("auto_update_available", info)
  );
  autoUpdater.on("update-not-available", info =>
    writeMainLog("auto_update_not_available", info)
  );
  autoUpdater.on("update-downloaded", info =>
    writeMainLog("auto_update_downloaded", info)
  );

  try {
    void autoUpdater.checkForUpdatesAndNotify();
  } catch (error) {
    writeMainLog("auto_update_start_failed", error);
  }
}

function writeMainLog(event: string, detail: unknown) {
  try {
    const dir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "main.log");
    const payload =
      typeof detail === "string"
        ? detail
        : detail instanceof Error
          ? `${detail.name}: ${detail.message}\n${detail.stack ?? ""}`
          : JSON.stringify(detail);
    fs.appendFileSync(
      file,
      `[${new Date().toISOString()}] ${event} ${payload}\n`,
      "utf8"
    );
  } catch {
    // ignore logging failures
  }
}

function registerIpc() {
  ipcMain.handle("store:read", () => readDesktopStore());
  ipcMain.handle("store:write-key", (_event, key, value) => {
    if (typeof key !== "string" || (value !== null && typeof value !== "string")) {
      return false;
    }
    return writeDesktopStoreKey(key, value);
  });
  ipcMain.handle("inventory:isConfigured", () => secretsConfigured());
  ipcMain.handle("inventory:getProducts", async () =>
    getProducts({ preferDelta: true })
  );
  ipcMain.handle("inventory:enqueueSale", (_event, sale) =>
    enqueueSaleFromRenderer(sale)
  );
  ipcMain.handle("inventory:syncPending", async () => syncPending());
  ipcMain.handle("inventory:getDeviceId", () => loadSecrets().deviceId);
  ipcMain.handle("inventory:pendingCount", () => countPendingSales());
  ipcMain.handle("inventory:getStatus", async () => fetchPosStatus());

  ipcMain.handle("auth:clearSession", async () => {
    const ses = mainWindow?.webContents.session ?? session.defaultSession;
    const cookies = await ses.cookies.get({ name: COOKIE_NAME });
    let cleared = 0;
    for (const cookie of cookies) {
      const domain = (cookie.domain || "").replace(/^\./, "");
      const scheme = cookie.secure ? "https" : "http";
      const url = domain
        ? `${scheme}://${domain}${cookie.path || "/"}`
        : undefined;
      if (!url) continue;
      await ses.cookies.remove(url, COOKIE_NAME);
      cleared += 1;
    }
    return { cleared };
  });

  ipcMain.handle("print:preview-print", async event => {
    const contents = event.sender;
    const owner = BrowserWindow.fromWebContents(contents);
    if (!owner || owner.isDestroyed()) {
      return { ok: false, error: "Print window closed" };
    }
    owner.show();
    owner.focus();
    // contents.print() on Windows shows the document and never the dialog.
    // window.print() opens the system print dialog, including its Print button.
    await contents.executeJavaScript("window.print()");
    return { ok: true };
  });

  ipcMain.handle("print:preview-close", event => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    if (owner && !owner.isDestroyed()) owner.close();
    return { ok: true };
  });

  ipcMain.handle(
    "print:receipt",
    async (_event, input: { title: string; documentHtml: string }) => {
      let win: BrowserWindow | null = null;
      try {
        if (!input || typeof input.documentHtml !== "string") {
          return { ok: false, error: "Nothing to print" };
        }
        win = new BrowserWindow({
          show: false,
          width: 520,
          height: 780,
          title: input.title || "Print",
          autoHideMenuBar: true,
          icon: resolveAppIcon(),
          webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
          },
        });
        denyBlankWindowOpens(win.webContents);

        const file = path.join(
          app.getPath("temp"),
          `gheir-print-${Date.now()}.html`
        );
        fs.writeFileSync(file, withPrintBar(input.documentHtml), "utf8");
        try {
          await win.loadFile(file);
        } finally {
          fs.rmSync(file, { force: true });
        }

        win.show();
        win.focus();
        return { ok: true };
      } catch (error) {
        if (win && !win.isDestroyed()) win.close();
        writeMainLog("print_failed", error);
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );
}

async function createWindow() {
  getDb();
  const icon = resolveAppIcon();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: "GHEIR POS",
    icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      partition: "persist:gheir-pos",
      sandbox: false,
    },
  });

  if (process.platform === "darwin" && icon) app.dock?.setIcon(icon);

  denyBlankWindowOpens(mainWindow.webContents);

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || "http://localhost:3000";
    await mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    if (!localServerUrl) {
      throw new Error("Local server URL not available");
    }
    await mainWindow.loadURL(localServerUrl);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function startLocalServerIfNeeded() {
  if (isDev) return;
  if (localServerUrl) return;

  process.env.GHEIR_DESKTOP = "1";
  ensureLocalJwtSecret();
  const apiApp = createApiApp();

  const staticDir = path.join(__dirname, "../dist/public");
  apiApp.use(express.static(staticDir));
  apiApp.use("*", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });

  localServer = createServer(apiApp);

  await new Promise<void>((resolve, reject) => {
    localServer!.listen(0, "127.0.0.1", () => resolve());
    localServer!.on("error", reject);
  });

  const addr = localServer.address();
  if (!addr || typeof addr === "string") {
    throw new Error("Unable to determine local server port");
  }
  localServerUrl = `http://127.0.0.1:${addr.port}`;
  writeMainLog("local_server_started", localServerUrl);
}

app.on("web-contents-created", (_event, contents) => {
  denyBlankWindowOpens(contents);
});

app.whenReady().then(async () => {
  registerIpc();
  startSyncWorker();
  await startLocalServerIfNeeded();
  await createWindow();
  setupAutoUpdate();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

process.on("uncaughtException", error =>
  writeMainLog("uncaughtException", error)
);
process.on("unhandledRejection", reason =>
  writeMainLog("unhandledRejection", reason)
);

app.on("render-process-gone", (_event, details) => {
  writeMainLog("render-process-gone", details);
});

app.on("window-all-closed", () => {
  stopSyncWorker();
  try {
    localServer?.close();
    localServer = null;
  } catch {}
  if (process.platform !== "darwin") app.quit();
});
