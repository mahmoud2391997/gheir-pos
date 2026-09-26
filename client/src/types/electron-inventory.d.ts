import type { ProductRecord } from "@shared/sku";
import type { PendingSale, PosStatus } from "@/_core/remoteInventory";

export type GheirInventoryBridge = {
  isConfigured: () => Promise<boolean>;
  getProducts: () => Promise<{ products: ProductRecord[]; pendingCount: number; configured: boolean }>;
  enqueueSale: (sale: PendingSale) => Promise<{ pendingCount: number }>;
  syncPending: () => Promise<{ synced: number; remaining: number }>;
  getDeviceId: () => Promise<string | undefined>;
  getStatus?: () => Promise<PosStatus>;
};

export type GheirAuthBridge = {
  clearSession: () => Promise<{ cleared: number }>;
};

declare global {
  interface Window {
    gheirInventory?: GheirInventoryBridge;
    gheirAuth?: GheirAuthBridge;
  }
}

export {};
