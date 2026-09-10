import { describe, expect, it } from "vitest";
import { createProductSku, generateSkuRows, roleCanAccess, skuLabelCsv } from "../shared/sku";

describe("GHEIR SKU rules", () => {
  it("composes a stable family, color extension, and unique copy serial", () => {
    expect(createProductSku("vase", "clay", 7)).toBe("VASE-CLAY-0007");
    expect(createProductSku(" tray ", "sand finish", 12)).toBe("TRAY-SAND-FINISH-0012");
  });

  it("generates sequential labels for a physical copy run", () => {
    const rows = generateSkuRows({ baseSku: "VESSEL", colorCode: "CLAY", copies: 3, nextSerial: 7 }, "Sculpted Vessel", "Clay", 1850);
    expect(rows.map((row) => row.sku)).toEqual(["VESSEL-CLAY-0007", "VESSEL-CLAY-0008", "VESSEL-CLAY-0009"]);
  });

  it("exports printer-friendly CSV with a header and escaped values", () => {
    const csv = skuLabelCsv([{ sku: "VASE-CLAY-0007", name: "Sculpted Vessel", color: "Clay", price: 1850 }]);
    expect(csv).toContain("SKU,Product,Color,Price");
    expect(csv).toContain('"VASE-CLAY-0007","Sculpted Vessel","Clay","1850.00"');
  });
});

describe("GHEIR POS roles", () => {
  it("keeps catalog and SKU controls admin-only", () => {
    expect(roleCanAccess("cashier", "register")).toBe(true);
    expect(roleCanAccess("cashier", "orders")).toBe(true);
    expect(roleCanAccess("cashier", "catalog")).toBe(false);
    expect(roleCanAccess("cashier", "sku")).toBe(false);
    expect(roleCanAccess("admin", "sku")).toBe(true);
  });
});
