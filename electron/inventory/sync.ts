import type { ProductRecord } from "../../shared/sku";
import { loadSecrets, secretsConfigured } from "../secrets";
import {
  appendSyncLog,
  countPendingSales,
  enqueueSale,
  listPendingSales,
  markSaleAttemptFailed,
  markSaleSynced,
  readCachedProducts,
  writeCachedProducts,
  type PendingSaleRow,
} from "./db";
import { applyPendingToStock, backoffMs, mapRemoteProducts, type RemoteProduct } from "./mapping";

export { applyPendingToStock, mapRemoteProducts, pendingQuantityBySku } from "./mapping";

async function fetchProductsFromApi(): Promise<ProductRecord[]> {
  const secrets = loadSecrets();
  if (!secretsConfigured(secrets)) throw new Error("POS secrets are not configured");
  const response = await fetch(`${secrets.websiteApiBaseUrl}/api/pos/products`, {
    headers: { "x-pos-key": secrets.posApiKey },
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string; products?: RemoteProduct[] };
  if (!response.ok) throw new Error(json.error ?? "Unable to load products");
  const products = Array.isArray(json.products) ? mapRemoteProducts(json.products) : [];
  writeCachedProducts(products);
  return products;
}

export async function getProducts(): Promise<{ products: ProductRecord[]; pendingCount: number; configured: boolean }> {
  const configured = secretsConfigured();
  const pending = listPendingSales();
  const pendingCount = countPendingSales();
  if (!configured) {
    return { products: applyPendingToStock(readCachedProducts(), pending), pendingCount, configured: false };
  }
  try {
    const remote = await fetchProductsFromApi();
    return { products: applyPendingToStock(remote, pending), pendingCount, configured: true };
  } catch (error) {
    appendSyncLog(null, "products_fetch_failed", error instanceof Error ? error.message : String(error));
    const cached = readCachedProducts();
    return { products: applyPendingToStock(cached, pending), pendingCount, configured: true };
  }
}

export function enqueueSaleFromRenderer(sale: {
  clientSaleId: string;
  deviceId?: string;
  createdAt: string;
  paymentMethod: PendingSaleRow["paymentMethod"];
  notes?: string;
  items: PendingSaleRow["items"];
}) {
  const secrets = loadSecrets();
  enqueueSale({
    ...sale,
    deviceId: sale.deviceId || secrets.deviceId,
  });
  return { pendingCount: countPendingSales() };
}

function nextBackoffMs(attempts: number) {
  return backoffMs(attempts) + Math.floor(Math.random() * 250);
}

export async function syncPending(): Promise<{ synced: number; remaining: number }> {
  const secrets = loadSecrets();
  if (!secretsConfigured(secrets)) return { synced: 0, remaining: countPendingSales() };

  const now = Date.now();
  const pending = listPendingSales().filter((sale) => {
    if (!sale.nextAttemptAt) return true;
    return Date.parse(sale.nextAttemptAt) <= now;
  });

  let synced = 0;
  for (const sale of pending) {
    try {
      const response = await fetch(`${secrets.websiteApiBaseUrl}/api/pos/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pos-key": secrets.posApiKey },
        body: JSON.stringify({
          clientSaleId: sale.clientSaleId,
          deviceId: sale.deviceId || secrets.deviceId,
          paymentMethod: sale.paymentMethod,
          notes: sale.notes,
          items: sale.items.map((it) => ({ sku: it.sku, quantity: it.quantity })),
        }),
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string; deduped?: boolean };
      if (!response.ok) throw new Error(json.error ?? `HTTP ${response.status}`);
      markSaleSynced(sale.clientSaleId, json.deduped ? "deduped" : "created");
      synced += 1;
    } catch (error) {
      const attempts = sale.attempts + 1;
      const next = new Date(Date.now() + nextBackoffMs(attempts)).toISOString();
      markSaleAttemptFailed(sale.clientSaleId, error instanceof Error ? error.message : String(error), next, attempts);
    }
  }

  return { synced, remaining: countPendingSales() };
}

let syncTimer: NodeJS.Timeout | null = null;

export function startSyncWorker(intervalMs = 15_000) {
  if (syncTimer) return;
  const tick = () => {
    void syncPending().catch((error) => {
      appendSyncLog(null, "sync_worker_error", error instanceof Error ? error.message : String(error));
    });
  };
  tick();
  syncTimer = setInterval(tick, intervalMs);
}

export function stopSyncWorker() {
  if (!syncTimer) return;
  clearInterval(syncTimer);
  syncTimer = null;
}
