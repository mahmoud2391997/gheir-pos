import type { ProductRecord } from "../../shared/sku";
import { loadSecrets, secretsConfigured } from "../secrets";
import {
  appendSyncLog,
  countPendingSales,
  enqueueSale,
  getMeta,
  listPendingSales,
  markSaleAttemptFailed,
  markSaleSynced,
  readCachedProducts,
  setMeta,
  writeCachedProducts,
  type PendingSaleRow,
} from "./db";
import { applyPendingToStock, backoffMs, mapRemoteProducts, type RemoteProduct } from "./mapping";

export { applyPendingToStock, mapRemoteProducts, pendingQuantityBySku } from "./mapping";

const ETAG_KEY = "remote_etag";
const LAST_UPDATED_KEY = "remote_last_updated_at";

export type PosStatus = {
  ok: boolean;
  configured: boolean;
  etag: string | null;
  lastUpdatedAt: string | null;
  inventoryVersion: string | null;
  changed: boolean;
};

function mergeBySku(existing: ProductRecord[], incoming: ProductRecord[]) {
  const bySku = new Map(existing.map((p) => [p.baseSku, p]));
  for (const product of incoming) {
    if (!product.baseSku) continue;
    bySku.set(product.baseSku, product);
  }
  return Array.from(bySku.values());
}

export async function fetchPosStatus(): Promise<PosStatus> {
  const secrets = loadSecrets();
  const configured = secretsConfigured(secrets);
  if (!configured) {
    return { ok: false, configured: false, etag: null, lastUpdatedAt: null, inventoryVersion: null, changed: false };
  }
  try {
    const response = await fetch(`${secrets.websiteApiBaseUrl}/api/pos/status`, {
      headers: { "x-pos-key": secrets.posApiKey },
    });
    const etag = response.headers.get("etag");
    const json = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      lastUpdatedAt?: string | null;
      inventoryVersion?: string | null;
    };
    if (!response.ok) {
      return { ok: false, configured: true, etag: null, lastUpdatedAt: null, inventoryVersion: null, changed: false };
    }
    if (json.lastUpdatedAt) {
      const previous = getMeta(LAST_UPDATED_KEY);
      const stored = getMeta(ETAG_KEY);
      const changed = Boolean(etag && etag !== stored);
      if (!changed || !previous) setMeta(LAST_UPDATED_KEY, json.lastUpdatedAt);
    }
    const stored = getMeta(ETAG_KEY);
    return {
      ok: json.ok !== false,
      configured: true,
      etag,
      lastUpdatedAt: json.lastUpdatedAt ?? null,
      inventoryVersion: json.inventoryVersion ?? null,
      changed: Boolean(etag && etag !== stored),
    };
  } catch (error) {
    appendSyncLog(null, "status_failed", error instanceof Error ? error.message : String(error));
    return { ok: false, configured: true, etag: null, lastUpdatedAt: null, inventoryVersion: null, changed: false };
  }
}

async function fetchProductsFromApi(options?: { force?: boolean; preferDelta?: boolean }): Promise<ProductRecord[]> {
  const secrets = loadSecrets();
  if (!secretsConfigured(secrets)) throw new Error("POS secrets are not configured");

  const cached = readCachedProducts();
  const storedEtag = getMeta(ETAG_KEY);
  const lastUpdatedAt = getMeta(LAST_UPDATED_KEY);
  const preferDelta = Boolean(options?.preferDelta && lastUpdatedAt && cached.length && !options?.force);

  if (preferDelta && lastUpdatedAt) {
    const response = await fetch(
      `${secrets.websiteApiBaseUrl}/api/pos/products?since=${encodeURIComponent(lastUpdatedAt)}`,
      { headers: { "x-pos-key": secrets.posApiKey } },
    );
    const etag = response.headers.get("etag");
    const json = (await response.json().catch(() => ({}))) as {
      error?: string;
      products?: RemoteProduct[];
      asOf?: string;
    };
    if (!response.ok) throw new Error(json.error ?? "Unable to load products");
    const incoming = mapRemoteProducts(Array.isArray(json.products) ? json.products : []);
    const merged = mergeBySku(cached, incoming);
    writeCachedProducts(merged);
    if (etag) setMeta(ETAG_KEY, etag);
    if (json.asOf) setMeta(LAST_UPDATED_KEY, json.asOf);
    return merged;
  }

  const headers: Record<string, string> = { "x-pos-key": secrets.posApiKey };
  if (!options?.force && storedEtag) headers["If-None-Match"] = storedEtag;

  const response = await fetch(`${secrets.websiteApiBaseUrl}/api/pos/products`, { headers });
  if (response.status === 304) return cached;

  const etag = response.headers.get("etag");
  const json = (await response.json().catch(() => ({}))) as {
    error?: string;
    products?: RemoteProduct[];
    asOf?: string;
  };
  if (!response.ok) throw new Error(json.error ?? "Unable to load products");
  const products = mapRemoteProducts(Array.isArray(json.products) ? json.products : []);
  writeCachedProducts(products);
  if (etag) setMeta(ETAG_KEY, etag);
  if (json.asOf) setMeta(LAST_UPDATED_KEY, json.asOf);
  return products;
}

export async function getProducts(options?: {
  force?: boolean;
  preferDelta?: boolean;
}): Promise<{ products: ProductRecord[]; pendingCount: number; configured: boolean }> {
  const configured = secretsConfigured();
  const pending = listPendingSales();
  const pendingCount = countPendingSales();
  if (!configured) {
    return { products: applyPendingToStock(readCachedProducts(), pending), pendingCount, configured: false };
  }
  try {
    const status = await fetchPosStatus();
    const shouldFetch = Boolean(options?.force || status.changed || !readCachedProducts().length);
    const remote = shouldFetch
      ? await fetchProductsFromApi({ force: options?.force, preferDelta: options?.preferDelta ?? status.changed })
      : readCachedProducts();
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
    void (async () => {
      await syncPending();
      const status = await fetchPosStatus();
      if (status.changed) await getProducts({ preferDelta: true });
    })().catch((error) => {
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
