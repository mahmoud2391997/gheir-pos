import { describe, expect, it } from "vitest";
import { applyPendingToStock, backoffMs, mapRemoteProducts, pendingQuantityBySku } from "./mapping";

describe("electron inventory mapping", () => {
  it("maps remote products to POS records", () => {
    const products = mapRemoteProducts([
      { name: "Clay Cup", slug: "clay-cup", sku: "CUP-01", category: "Tableware", price: 120, stock: 4, status: "published" },
    ]);
    expect(products).toHaveLength(1);
    expect(products[0]?.baseSku).toBe("CUP-01");
    expect(products[0]?.active).toBe(true);
  });

  it("applies pending quantities to cached stock", () => {
    const products = mapRemoteProducts([
      { name: "Clay Cup", slug: "clay-cup", sku: "CUP-01", category: "Tableware", price: 120, stock: 4 },
    ]);
    const pending = [{ items: [{ sku: "CUP-01", quantity: 2 }] }];
    expect(pendingQuantityBySku(pending).get("CUP-01")).toBe(2);
    expect(applyPendingToStock(products, pending)[0]?.stock).toBe(2);
  });

  it("uses exponential backoff capped at 60s", () => {
    expect(backoffMs(1)).toBe(1000);
    expect(backoffMs(2)).toBe(2000);
    expect(backoffMs(10)).toBe(60_000);
  });
});
