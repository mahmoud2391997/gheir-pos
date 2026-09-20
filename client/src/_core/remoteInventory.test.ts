import { describe, expect, it } from "vitest";
import { applyPendingToStock, mapRemoteProduct, mergeProductsBySku } from "./remoteInventory";

describe("remote inventory etag helpers", () => {
  it("maps remote products keyed by sku", () => {
    const mapped = mapRemoteProduct({
      name: "Clay Cup",
      slug: "clay-cup",
      sku: "CUP-01",
      category: "Tableware",
      price: 120,
      stock: 4,
      status: "published",
    });
    expect(mapped.baseSku).toBe("CUP-01");
    expect(mapped.active).toBe(true);
  });

  it("merges delta products by sku without duplicating", () => {
    const existing = [
      mapRemoteProduct({ name: "A", slug: "a", sku: "A-1", category: "X", price: 10, stock: 5 }),
      mapRemoteProduct({ name: "B", slug: "b", sku: "B-1", category: "X", price: 20, stock: 2 }),
    ];
    const delta = [mapRemoteProduct({ name: "A", slug: "a", sku: "A-1", category: "X", price: 10, stock: 3 })];
    const merged = mergeProductsBySku(existing, delta);
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.baseSku === "A-1")?.stock).toBe(3);
    expect(merged.find((p) => p.baseSku === "B-1")?.stock).toBe(2);
  });

  it("applies pending stock by sku", () => {
    const products = [mapRemoteProduct({ name: "A", slug: "a", sku: "A-1", category: "X", price: 10, stock: 5 })];
    const pending = [
      {
        clientSaleId: "GH-1",
        createdAt: new Date().toISOString(),
        paymentMethod: "cash" as const,
        items: [{ sku: "A-1", quantity: 2, unitPrice: 10, name: "A" }],
      },
    ];
    expect(applyPendingToStock(products, pending)[0]?.stock).toBe(3);
  });
});
