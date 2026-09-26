import type { ProductRecord } from "../../shared/sku";

export type RemoteProduct = {
  name: string;
  slug: string;
  sku?: string;
  category: string;
  price: number;
  stock: number;
  status?: string;
};

type PendingLike = {
  items: Array<{ sku: string; quantity: number }>;
};

function skuToId(sku: string) {
  let h = 0;
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  const id = h % 2147483647;
  return id === 0 ? 1 : id;
}

export function mapRemoteProducts(products: RemoteProduct[]): ProductRecord[] {
  return products.map(p => {
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

export function pendingQuantityBySku(pending: PendingLike[]) {
  const map = new Map<string, number>();
  for (const sale of pending) {
    for (const it of sale.items) {
      map.set(it.sku, (map.get(it.sku) ?? 0) + it.quantity);
    }
  }
  return map;
}

export function applyPendingToStock(
  products: ProductRecord[],
  pending: PendingLike[]
) {
  const pendingBySku = pendingQuantityBySku(pending);
  return products.map(p => {
    const pendingQty = pendingBySku.get(p.baseSku) ?? 0;
    return { ...p, stock: Math.max(0, p.stock - pendingQty) };
  });
}

export function backoffMs(attempts: number) {
  return Math.min(60_000, 1_000 * 2 ** Math.max(0, attempts - 1));
}
