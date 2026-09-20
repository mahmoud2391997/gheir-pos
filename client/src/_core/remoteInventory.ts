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

const baseUrl = () => String(import.meta.env.VITE_WEBSITE_API_BASE_URL || "").replace(/\/+$/, "");
const posKey = () => String(import.meta.env.VITE_POS_API_KEY || "");
export const deviceId = () => String(import.meta.env.VITE_POS_DEVICE_ID || "").trim() || undefined;

export function remoteEnabled() {
  return Boolean(baseUrl() && posKey());
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
  localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
}

export function readPendingSales(): PendingSale[] {
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
  localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(items));
}

export function enqueuePendingSale(sale: PendingSale) {
  const cur = readPendingSales();
  if (cur.some((s) => s.clientSaleId === sale.clientSaleId)) return;
  writePendingSales([sale, ...cur]);
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

export async function fetchRemoteProducts(): Promise<ProductRecord[]> {
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

export async function syncPendingSales(): Promise<{ synced: number; remaining: number }> {
  const pending = readPendingSales();
  if (!pending.length) return { synced: 0, remaining: 0 };
  if (!remoteEnabled()) return { synced: 0, remaining: pending.length };
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
