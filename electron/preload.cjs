const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("gheirDesktop", {
  readStore: () => ipcRenderer.invoke("store:read"),
  writeKey: (key, value) => ipcRenderer.invoke("store:write-key", key, value),
});

contextBridge.exposeInMainWorld("gheirPrint", {
  printReceipt: (input) => ipcRenderer.invoke("print:receipt", input),
});

contextBridge.exposeInMainWorld("gheirPrintPreview", {
  print: () => ipcRenderer.invoke("print:preview-print"),
  close: () => ipcRenderer.invoke("print:preview-close"),
});
