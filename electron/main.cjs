const { app, BrowserWindow, ipcMain, nativeImage, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

function storePath() {
  return path.join(app.getPath("userData"), "gheir-store.json");
}

function readStore() {
  try {
    const raw = JSON.parse(fs.readFileSync(storePath(), "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writeStore(data) {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  fs.writeFileSync(storePath(), JSON.stringify(data, null, 2));
}

ipcMain.handle("store:read", () => readStore());

ipcMain.handle("store:write-key", (_event, key, value) => {
  if (typeof key !== "string" || !key.startsWith("gheir-")) return false;
  const current = readStore();
  if (value == null) delete current[key];
  else current[key] = String(value);
  writeStore(current);
  return true;
});

if (process.platform === "win32") app.setAppUserModelId("com.gheir.pos");

function isHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function denyBlankWindowOpens(contents) {
  contents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) {
      void shell.openExternal(url).catch(() => undefined);
      return { action: "deny" };
    }
    if (!url || url === "about:blank") return { action: "allow" };
    return { action: "deny" };
  });
}

function withPrintBar(documentHtml) {
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

ipcMain.handle("print:preview-print", async (event) => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  if (!owner || owner.isDestroyed()) return { ok: false, error: "Print window closed" };
  owner.show();
  owner.focus();
  await event.sender.executeJavaScript("window.print()");
  return { ok: true };
});

ipcMain.handle("print:preview-close", (event) => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  if (owner && !owner.isDestroyed()) owner.close();
  return { ok: true };
});

ipcMain.handle("print:receipt", async (_event, input) => {
  let win = null;
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
      icon: appIcon(),
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    denyBlankWindowOpens(win.webContents);
    const file = path.join(app.getPath("temp"), `gheir-print-${Date.now()}.html`);
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
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

function appIcon() {
  const file = path.join(__dirname, "assets/icon.png");
  if (!fs.existsSync(file)) return undefined;
  const image = nativeImage.createFromPath(file);
  return image.isEmpty() ? undefined : image;
}

function createWindow() {
  const icon = appIcon();
  if (process.platform === "darwin" && icon && app.dock) app.dock.setIcon(icon);
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "GHEIR POS",
    icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  denyBlankWindowOpens(window.webContents);

  if (app.isPackaged) {
    window.loadFile(path.join(__dirname, "../dist/public/index.html"));
    return;
  }

  window.loadURL(process.env.ELECTRON_START_URL || "http://localhost:3000");
}

app.on("web-contents-created", (_event, contents) => {
  denyBlankWindowOpens(contents);
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
