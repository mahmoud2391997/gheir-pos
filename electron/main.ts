import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { app, BrowserWindow, ipcMain, session, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { COOKIE_NAME } from "../shared/const";
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
let mainWindow: BrowserWindow | null = null;

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

  ipcMain.handle(
    "print:receipt",
    async (_event, input: { title: string; documentHtml: string }) => {
      try {
        const win = new BrowserWindow({
          show: false,
          width: 480,
          height: 740,
          title: input.title || "Print",
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            partition: "persist:gheir-pos",
          },
        });

        const url = `data:text/html;charset=utf-8,${encodeURIComponent(input.documentHtml)}`;
        await win.loadURL(url);

        const result = await new Promise<{ ok: boolean; error?: string }>(
          resolve => {
            win.webContents.print(
              { silent: false, printBackground: true },
              (success, failureReason) => {
                resolve(
                  success
                    ? { ok: true }
                    : { ok: false, error: failureReason || "Print failed" }
                );
              }
            );
          }
        );

        win.close();
        return result;
      } catch (error) {
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
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: "GHEIR POS",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      partition: "persist:gheir-pos",
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || "http://localhost:3000";
    await mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexHtml = path.join(__dirname, "../dist/public/index.html");
    await mainWindow.loadFile(indexHtml);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  registerIpc();
  startSyncWorker();
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
  if (process.platform !== "darwin") app.quit();
});
