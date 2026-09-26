import { contextBridge, ipcRenderer } from "electron";

export type PendingSalePayload = {
  clientSaleId: string;
  deviceId?: string;
  createdAt: string;
  paymentMethod: "cash" | "card" | "instapay";
  notes?: string;
  items: Array<{
    sku: string;
    quantity: number;
    unitPrice: number;
    name: string;
  }>;
};

const inventory = {
  isConfigured: () =>
    ipcRenderer.invoke("inventory:isConfigured") as Promise<boolean>,
  getProducts: () =>
    ipcRenderer.invoke("inventory:getProducts") as Promise<{
      products: unknown[];
      pendingCount: number;
      configured: boolean;
    }>,
  enqueueSale: (sale: PendingSalePayload) =>
    ipcRenderer.invoke("inventory:enqueueSale", sale) as Promise<{
      pendingCount: number;
    }>,
  syncPending: () =>
    ipcRenderer.invoke("inventory:syncPending") as Promise<{
      synced: number;
      remaining: number;
    }>,
  getDeviceId: () =>
    ipcRenderer.invoke("inventory:getDeviceId") as Promise<string | undefined>,
  getStatus: () =>
    ipcRenderer.invoke("inventory:getStatus") as Promise<{
      ok: boolean;
      configured: boolean;
      etag: string | null;
      lastUpdatedAt: string | null;
      inventoryVersion: string | null;
      changed: boolean;
    }>,
};

contextBridge.exposeInMainWorld("gheirInventory", inventory);

const auth = {
  clearSession: () =>
    ipcRenderer.invoke("auth:clearSession") as Promise<{ cleared: number }>,
};

contextBridge.exposeInMainWorld("gheirAuth", auth);

const print = {
  printReceipt: (input: { title: string; documentHtml: string }) =>
    ipcRenderer.invoke("print:receipt", input) as Promise<{
      ok: boolean;
      error?: string;
    }>,
};

contextBridge.exposeInMainWorld("gheirPrint", print);
