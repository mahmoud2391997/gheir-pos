const { app, BrowserWindow, ipcMain } = require("electron");
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

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "GHEIR POS",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    window.loadFile(path.join(__dirname, "../dist/public/index.html"));
    return;
  }

  window.loadURL(process.env.ELECTRON_START_URL || "http://localhost:3000");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
