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
    if (isHttpUrl(url)) void shell.openExternal(url).catch(() => undefined);
    return { action: "deny" };
  });
}

ipcMain.handle("print:receipt", async (_event, input) => {
  let win = null;
  try {
    if (!input || typeof input.documentHtml !== "string") {
      return { ok: false, error: "Nothing to print" };
    }
    win = new BrowserWindow({
      show: false,
      width: 480,
      height: 740,
      title: input.title || "Print",
      icon: appIcon(),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    denyBlankWindowOpens(win.webContents);
    const file = path.join(app.getPath("temp"), `gheir-print-${Date.now()}.html`);
    fs.writeFileSync(file, input.documentHtml, "utf8");
    try {
      await win.loadFile(file);
    } finally {
      fs.rmSync(file, { force: true });
    }
    const result = await new Promise((resolve) => {
      win.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        resolve(success ? { ok: true } : { ok: false, error: failureReason || "Print failed" });
      });
    });
    win.close();
    return result;
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
