import { describe, expect, it } from "vitest";
import { createDemoSale, type ProductRecord } from "@shared/sku";

describe("order color variants", () => {
  it("keeps separate product links, colors, quantities and costs for a shared family", () => {
    const base: ProductRecord = { id: 10, name: "Cup", category: "Tableware", baseSku: "CUP", color: "Red", colorCode: "RED", price: 100, cost: 40, stock: 5, shape: "round" };
    const sale = createDemoSale([{ product: base, quantity: 3 }, { product: { ...base, id: 11, color: "Blue", colorCode: "BLUE" }, quantity: 2 }], "cash", { discount: 50, tendered: 500 });
    expect(sale.items.map((item) => [item.productId, item.color, item.quantity, item.total, item.costTotal])).toEqual([[10, "Red", 3, 300, 120], [11, "Blue", 2, 200, 80]]);
    expect(sale.total).toBe(450);
    expect(sale.change).toBe(50);
  });
});
