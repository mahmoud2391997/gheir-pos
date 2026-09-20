import type { PaymentMethod, ProductRecord } from "@shared/sku";

export type RemoteProduct = {
  _id?: string;
  name: string;
  slug: string;
  sku?: string;
  category: string;
  price: number;
  currency?: string;
  stock: number;
  status?: string;
};

export type PendingSale = {
  clientSaleId: string; // idempotency key; use receiptNumber
  deviceId?: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number; name: string }>;
};

type InventoryBridge = {
  isConfigured: () => Promise<boolean>;
  getProducts: () => Promise<{ products: ProductRecord[]; pendingCount: number; configured: boolean }>;
  enqueueSale: (sale: PendingSale) => Promise<{ pendingCount: number }>;
  syncPending: () => Promise<{ synced: number; remaining: number }>;
  getDeviceId: () => Promise<string | undefined>;
};

declare global {
  interface Window {
    gheirInventory?: InventoryBridge;
  }
}

const baseUrl = () => String(import.meta.env.VITE_WEBSITE_API_BASE_URL || "").replace(/\/+$/, "");
/** Web-only fallback. Electron never injects VITE_POS_API_KEY into the renderer. */
const posKey = () => String(import.meta.env.VITE_POS_API_KEY || "");
export const deviceId = () => String(import.meta.env.VITE_POS_DEVICE_ID || "").trim() || undefined;

function bridge(): InventoryBridge | undefined {
  return typeof window !== "undefined" ? window.gheirInventory : undefined;
}

export function usesElectronBridge() {
  return Boolean(bridge());
}

function skuToId(sku: string) {
  let h = 0;
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  const id = h % 2147483647;
  return id === 0 ? 1 : id;
}

const PRODUCTS_CACHE_KEY = "gheir_pos_remote_products_v1";
const PENDING_SALES_KEY = "gheir_pos_pending_sales_v1";

export function readCachedProducts(): ProductRecord[] {
  if (usesElectronBridge()) return [];
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCachedProducts(products: ProductRecord[]) {
  if (usesElectronBridge()) return;
  localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
}

export function readPendingSales(): PendingSale[] {
  if (usesElectronBridge()) return [];
  try {
    const raw = localStorage.getItem(PENDING_SALES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writePendingSales(items: PendingSale[]) {
  if (usesElectronBridge()) return;
  localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(items));
}

export function enqueuePendingSale(sale: PendingSale) {
  if (usesElectronBridge()) {
    void bridge()!.enqueueSale(sale);
    return;
  }
  const cur = readPendingSales();
  if (cur.some((s) => s.clientSaleId === sale.clientSaleId)) return;
  writePendingSales([sale, ...cur]);
}

export async function enqueuePendingSaleAsync(sale: PendingSale) {
  const b = bridge();
  if (b) return b.enqueueSale(sale);
  enqueuePendingSale(sale);
  return { pendingCount: readPendingSales().length };
}

export function pendingQuantityBySku(pending: PendingSale[]) {
  const map = new Map<string, number>();
  for (const sale of pending) {
    for (const it of sale.items) {
      map.set(it.sku, (map.get(it.sku) ?? 0) + it.quantity);
    }
  }
  return map;
}

export function applyPendingToStock(products: ProductRecord[], pending: PendingSale[]) {
  const pendingBySku = pendingQuantityBySku(pending);
  return products.map((p) => {
    const sku = p.baseSku;
    const pendingQty = pendingBySku.get(sku) ?? 0;
    return { ...p, stock: Math.max(0, p.stock - pendingQty) };
  });
}

export async function remoteEnabled() {
  const b = bridge();
  if (b) return b.isConfigured();
  return Boolean(baseUrl() && posKey());
}

/** Sync web-only hint. Electron configuration is resolved asynchronously via the bridge. */
export function remoteEnabledSync() {
  if (usesElectronBridge()) return false;
  return Boolean(baseUrl() && posKey());
}

export async function fetchRemoteProducts(): Promise<ProductRecord[]> {
  const b = bridge();
  if (b) {
    const result = await b.getProducts();
    return result.products;
  }
  const url = `${baseUrl()}/api/pos/products`;
  const response = await fetch(url, { headers: { "x-pos-key": posKey() } });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? "Unable to load products");
  const products = Array.isArray(json.products) ? (json.products as RemoteProduct[]) : [];
  return products.map((p) => {
    const sku = String(p.sku || p.slug || "").trim();
    const baseSku = sku || String(p.slug || "").trim();
    const name = String(p.name || baseSku);
    const category = String(p.category || "Uncategorized");
    const stock = Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0;
    const price = Number.isFinite(Number(p.price)) ? Number(p.price) : 0;
    return {
      id: skuToId(baseSku),
      name,
      englishName: name,
      arabicName: null,
      category,
      categoryAr: null,
      baseSku,
      price,
      stock,
      color: "Default",
      colorArabic: null,
      colorCode: "DEF",
      shape: "rect",
      barcode: baseSku.replace(/[^A-Za-z0-9]/g, ""),
      active: p.status ? String(p.status) === "published" : true,
    } satisfies ProductRecord;
  });
}

export async function loadInventorySnapshot(): Promise<{ products: ProductRecord[]; pendingCount: number; configured: boolean }> {
  const b = bridge();
  if (b) return b.getProducts();
  const configured = Boolean(baseUrl() && posKey());
  if (!configured) {
    return { products: [], pendingCount: readPendingSales().length, configured: false };
  }
  const pending = readPendingSales();
  try {
    const remote = await fetchRemoteProducts();
    writeCachedProducts(remote);
    return { products: applyPendingToStock(remote, pending), pendingCount: pending.length, configured: true };
  } catch {
    const cached = readCachedProducts();
    return { products: applyPendingToStock(cached, pending), pendingCount: pending.length, configured: true };
  }
}

export async function syncPendingSales(): Promise<{ synced: number; remaining: number }> {
  const b = bridge();
  if (b) return b.syncPending();

  const pending = readPendingSales();
  if (!pending.length) return { synced: 0, remaining: 0 };
  if (!(await remoteEnabled())) return { synced: 0, remaining: pending.length };
  if (!navigator.onLine) return { synced: 0, remaining: pending.length };

  const kept: PendingSale[] = [];
  let synced = 0;
  for (const sale of pending) {
    try {
      const response = await fetch(`${baseUrl()}/api/pos/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pos-key": posKey() },
        body: JSON.stringify({
          clientSaleId: sale.clientSaleId,
          deviceId: sale.deviceId,
          paymentMethod: sale.paymentMethod,
          notes: sale.notes,
          items: sale.items.map((it) => ({ sku: it.sku, quantity: it.quantity })),
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Sync failed");
      synced += 1;
    } catch {
      kept.push(sale);
    }
  }
  writePendingSales(kept);
  return { synced, remaining: kept.length };
}

export async function resolveDeviceId() {
  const b = bridge();
  if (b) return (await b.getDeviceId()) || undefined;
  return deviceId();
}
