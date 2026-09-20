import path from "node:path";
import { config as loadEnv } from "dotenv";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { countPendingSales, getDb } from "./inventory/db";
import { enqueueSaleFromRenderer, fetchPosStatus, getProducts, startSyncWorker, stopSyncWorker, syncPending } from "./inventory/sync";
import { loadSecrets, secretsConfigured } from "./secrets";

loadEnv();

// esbuild CJS output provides __dirname for the compiled bundle location (dist-electron/).
declare const __dirname: string;

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

function registerIpc() {
  ipcMain.handle("inventory:isConfigured", () => secretsConfigured());
  ipcMain.handle("inventory:getProducts", async () => getProducts({ preferDelta: true }));
  ipcMain.handle("inventory:enqueueSale", (_event, sale) => enqueueSaleFromRenderer(sale));
  ipcMain.handle("inventory:syncPending", async () => syncPending());
  ipcMain.handle("inventory:getDeviceId", () => loadSecrets().deviceId);
  ipcMain.handle("inventory:pendingCount", () => countPendingSales());
  ipcMain.handle("inventory:getStatus", async () => fetchPosStatus());
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
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  stopSyncWorker();
  if (process.platform !== "darwin") app.quit();
});
