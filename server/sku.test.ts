import { describe, expect, it } from "vitest";
import { authenticateLocal, bilingualText, createLocalDatabase, createProductSku, generateSkuRows, normalizeLocalAccounts, ordersDocumentHtml, parseLocalDatabase, parseProductCsv, productCsv, roleCanAccess, salesCsv, skuLabelCsv } from "../shared/sku";

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
    const csv = skuLabelCsv([{ sku: "VASE-CLAY-0007", name: "Sculpted Vessel", arabicName: "إناء منحوت", color: "Clay", colorArabic: "طين", price: 1850 }]);
    expect(csv).toContain("SKU,Product English · المنتج بالإنجليزية,Product Arabic · المنتج بالعربية,Color English · اللون بالإنجليزية,Color Arabic · اللون بالعربية,Price · السعر");
    expect(csv).toContain('"VASE-CLAY-0007","Sculpted Vessel","إناء منحوت","Clay","طين","1850.00"');
  });
});

describe("local register login", () => {
  it("accepts the store accounts and rejects anything else", () => {
    expect(authenticateLocal("mariam", "cashier")).toMatchObject({ name: "Mariam Adel", role: "cashier" });
    expect(authenticateLocal("Omar", "admin")).toMatchObject({ name: "Omar Nassar", role: "admin" });
    expect(authenticateLocal("mariam", "admin")).toBeNull();
    expect(authenticateLocal("guest", "cashier")).toBeNull();
    expect(authenticateLocal("lina", "counter", [{ username: "lina", password: "counter", name: "Lina Farid", role: "cashier" }, { username: "omar", password: "admin", name: "Omar Nassar", role: "admin" }])).toMatchObject({ name: "Lina Farid", role: "cashier" });
    expect(normalizeLocalAccounts([{ username: "lina", password: "counter", name: "Lina Farid", role: "cashier" }])).toBeNull();
    expect(normalizeLocalAccounts([{ username: "same", password: "one", name: "Cashier", role: "cashier" }, { username: "same", password: "two", name: "Admin", role: "admin" }])).toBeNull();
  });
});

describe("local database backup", () => {
  it("round-trips products, sales, and settings, and rejects a bad file", () => {
    const database = createLocalDatabase({ products: [{ id: 4, name: "Mug", category: "Tableware", baseSku: "MUG", price: 50, stock: 2, color: "Clay", colorCode: "CLAY", shape: "round" }], sales: [{ id: 1, receiptNumber: "GH-1", total: 50, discount: 0, tax: 0, paymentMethod: "cash", items: [{ name: "Mug", quantity: 1, total: 50 }], createdAt: "2026-09-26T12:00:00.000Z" }], settings: { storeName: "Atelier", storeAddress: "Cairo", taxPercent: 14, receiptFooter: "Thanks", printerPaper: "80mm" }, language: "ar" });
    const restored = parseLocalDatabase(JSON.stringify(database));
    expect(restored?.products[0]?.name).toBe("Mug");
    expect(restored?.sales[0]?.receiptNumber).toBe("GH-1");
    expect(restored?.settings.storeName).toBe("Atelier");
    expect(restored?.language).toBe("ar");
    expect(restored?.accounts?.map((account) => account.username)).toEqual(["mariam", "omar"]);
    const legacy = JSON.parse(JSON.stringify(database)) as { accounts?: unknown };
    delete legacy.accounts;
    expect(parseLocalDatabase(JSON.stringify(legacy))?.accounts).toBeUndefined();
    expect(parseLocalDatabase("{")).toBeNull();
    expect(parseLocalDatabase(JSON.stringify({ version: 1, products: [], sales: [{ id: 1 }] }))).toBeNull();
    expect(salesCsv(database.sales)).toContain("GH-1");
    expect(salesCsv(database.sales)).toContain("1x Mug");
    expect(salesCsv([{ ...database.sales[0], items: [{ name: "Mug", arabicName: "كوب", quantity: 1, total: 50 }] }])).toContain("1x Mug · كوب");
    expect(salesCsv(database.sales)).toContain("Cash · نقداً");
    expect(ordersDocumentHtml(database.sales, "Atelier")).toContain("orders · الطلبات");
    expect(bilingualText("GHEIR", "غيّر")).toBe("GHEIR · غيّر");
    expect(parseProductCsv(productCsv([{ id: 4, name: "Mug", arabicName: "كوب", category: "Tableware", categoryAr: "أطباق", baseSku: "MUG", price: 50, stock: 2, color: "Clay", colorArabic: "طين", colorCode: "CLAY", shape: "round" }]))[0]).toMatchObject({ name: "Mug", arabicName: "كوب", categoryAr: "أطباق", colorArabic: "طين" });
  });
});

describe("GHEIR POS roles", () => {
  it("keeps catalog and SKU controls admin-only", () => {
    expect(roleCanAccess("cashier", "register")).toBe(true);
    expect(roleCanAccess("cashier", "orders")).toBe(true);
    expect(roleCanAccess("cashier", "catalog")).toBe(false);
    expect(roleCanAccess("cashier", "sku")).toBe(false);
    expect(roleCanAccess("admin", "sku")).toBe(true);
    expect(roleCanAccess("cashier", "settings")).toBe(false);
    expect(roleCanAccess("admin", "settings")).toBe(true);
  });
});
