import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateLocal, bilingualText, createLocalDatabase, createProductSku, defaultSystemSettings, demoProducts, demoSales, generateSkuRows, hydrateDesktopStore, localizedText, normalizeLocalAccounts, normalizeSystemSettings, ordersDocumentHtml, parseLocalDatabase, parseProductCsv, printHtmlDocument, productCsv, readDemoProducts, readDemoSales, readLocalAccounts, roleCanAccess, salesCsv, skuLabelCsv } from "../shared/sku";

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
    expect(csv).toContain("SKU,Product English,Product Arabic,Color English,Color Arabic,Price");
    expect(skuLabelCsv([{ sku: "VASE-CLAY-0007", name: "Sculpted Vessel", arabicName: "إناء منحوت", color: "Clay", colorArabic: "طين", price: 1850 }], "ar")).toContain("SKU,المنتج بالإنجليزية,المنتج بالعربية,اللون بالإنجليزية,اللون بالعربية,السعر");
    expect(csv).toContain('"VASE-CLAY-0007","Sculpted Vessel","إناء منحوت","Clay","طين","1850.00"');
  });
});

describe("local register login", () => {
  it("accepts the store accounts and rejects anything else", () => {
    expect(authenticateLocal("ziad", "cashier")).toMatchObject({ name: "Ziad", role: "cashier" });
    expect(authenticateLocal("Ziad", "admin")).toMatchObject({ name: "Ziad", role: "admin" });
    expect(authenticateLocal("ziad", "wrong")).toBeNull();
    expect(authenticateLocal("guest", "cashier")).toBeNull();
    expect(authenticateLocal("lina", "counter", [{ username: "lina", password: "counter", name: "Lina Farid", role: "cashier" }, { username: "omar", password: "admin", name: "Omar Nassar", role: "admin" }])).toMatchObject({ name: "Lina Farid", role: "cashier" });
    expect(normalizeLocalAccounts([{ username: "lina", password: "counter", name: "Lina Farid", role: "cashier" }])).toBeNull();
    expect(normalizeLocalAccounts([{ username: "ziad", password: "cashier", name: "Ziad", role: "cashier" }, { username: "ziad", password: "admin", name: "Ziad", role: "admin" }])).toMatchObject([{ role: "cashier" }, { role: "admin" }]);
    expect(normalizeLocalAccounts([{ username: "same", password: "one", name: "Cashier", role: "cashier" }, { username: "same", password: "one", name: "Admin", role: "admin" }])).toBeNull();
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
    expect(restored?.accounts?.map((account) => account.username)).toEqual(["ziad", "ziad"]);
    expect(restored?.accounts?.map((account) => account.password)).toEqual(["cashier", "admin"]);
    const withPhoto = createLocalDatabase({ products: [{ ...database.products[0], image: "data:image/jpeg;base64,abc" }], sales: database.sales, settings: database.settings, language: "en" });
    expect(parseLocalDatabase(JSON.stringify(withPhoto))?.products[0]?.image).toBe("data:image/jpeg;base64,abc");
    expect(parseLocalDatabase(JSON.stringify(createLocalDatabase({ products: [{ ...database.products[0], image: "https://example.com/mug.jpg" }], sales: database.sales, settings: database.settings, language: "en" })))?.products[0]?.image).toBeNull();
    const legacy = JSON.parse(JSON.stringify(database)) as { accounts?: unknown };
    delete legacy.accounts;
    expect(parseLocalDatabase(JSON.stringify(legacy))?.accounts).toBeUndefined();
    expect(parseLocalDatabase("{")).toBeNull();
    expect(parseLocalDatabase(JSON.stringify({ version: 1, products: [], sales: [{ id: 1 }] }))).toBeNull();
    expect(salesCsv(database.sales)).toContain("GH-1");
    expect(salesCsv(database.sales)).toContain("1x Mug");
    expect(salesCsv([{ ...database.sales[0], items: [{ name: "Mug", arabicName: "كوب", quantity: 1, total: 50 }] }])).toContain("1x Mug");
    expect(salesCsv([{ ...database.sales[0], items: [{ name: "Mug", arabicName: "كوب", quantity: 1, total: 50 }] }], "ar")).toContain("1x كوب");
    expect(salesCsv(database.sales)).toContain("Cash");
    expect(salesCsv(database.sales, "ar")).toContain("نقداً");
    expect(ordersDocumentHtml(database.sales, "Atelier")).toContain("Atelier — orders");
    expect(ordersDocumentHtml(database.sales, "Atelier", "ar")).toContain("الطلبات");
    expect(ordersDocumentHtml(database.sales, "Atelier")).not.toContain("orders · الطلبات");
    expect(bilingualText("GHEIR", "غيّر")).toBe("GHEIR · غيّر");
    expect(localizedText("en", "GHEIR", "غيّر")).toBe("GHEIR");
    expect(localizedText("ar", "GHEIR", "غيّر")).toBe("غيّر");
    expect(parseProductCsv(productCsv([{ id: 4, name: "Mug", arabicName: "كوب", category: "Tableware", categoryAr: "أطباق", baseSku: "MUG", price: 50, stock: 2, color: "Clay", colorArabic: "طين", colorCode: "CLAY", shape: "round" }], "ar"))[0]).toMatchObject({ name: "Mug", arabicName: "كوب", categoryAr: "أطباق", colorArabic: "طين" });
    expect(parseProductCsv(productCsv([{ id: 4, name: "Mug", arabicName: "كوب", category: "Tableware", categoryAr: "أطباق", baseSku: "MUG", price: 50, stock: 2, color: "Clay", colorArabic: "طين", colorCode: "CLAY", shape: "round" }]))[0]).toMatchObject({ name: "Mug", arabicName: "كوب", categoryAr: "أطباق", colorArabic: "طين" });
  });
});

describe("desktop persistence and receipt output", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("hydrates saved desktop data and migrates local GHEIR keys", async () => {
    const values = new Map([
      ["gheir-demo-products", "local products"],
      ["gheir-demo-sales", "stale sales"],
    ]);
    const writeKey = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("localStorage", {
      get length() { return values.size; },
      key: (index: number) => [...values.keys()][index] ?? null,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    });
    vi.stubGlobal("window", {
      gheirDesktop: {
        readStore: vi.fn().mockResolvedValue({ "gheir-demo-sales": "saved sales" }),
        writeKey,
      },
    });

    await hydrateDesktopStore();

    expect(values.get("gheir-demo-sales")).toBe("saved sales");
    expect(writeKey).toHaveBeenCalledWith("gheir-demo-products", "local products");
  });

  it("adds UTF-8 metadata to desktop print documents", () => {
    const printReceipt = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("window", { gheirPrint: { printReceipt } });

    printHtmlDocument("Receipt", "<!doctype html><html><head><title>Receipt</title></head><body>شكراً</body></html>");

    expect(printReceipt).toHaveBeenCalledWith(expect.objectContaining({
      documentHtml: expect.stringContaining('<head><meta charset="UTF-8"><title>Receipt</title>'),
    }));
  });

  it("replaces saved receipt footers containing broken Arabic characters", () => {
    expect(normalizeSystemSettings({
      ...defaultSystemSettings,
      receiptFooter: "شكراً لاختياركم غ��ّر.",
    }).receiptFooter).toBe(defaultSystemSettings.receiptFooter);
  });
});

describe("blank register data", () => {
  function memoryStorage() {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
      setItem: (key: string, value: string) => { data.set(key, String(value)); },
      removeItem: (key: string) => { data.delete(key); },
    });
    return data;
  }

  afterEach(() => { vi.unstubAllGlobals(); });

  it("starts with an empty shelf and drops only the shipped sample", () => {
    const data = memoryStorage();
    expect(readDemoProducts()).toEqual([]);
    expect(readDemoSales()).toEqual([]);
    data.set("gheir-demo-products", JSON.stringify(demoProducts));
    data.set("gheir-demo-sales", JSON.stringify(demoSales));
    expect(readDemoProducts()).toEqual([]);
    expect(readDemoSales()).toEqual([]);
    expect(JSON.parse(data.get("gheir-demo-products") || "null")).toEqual([]);
    expect(JSON.parse(data.get("gheir-demo-sales") || "null")).toEqual([]);
    const custom = [{ id: 99, name: "Custom Bowl", category: "Decor", baseSku: "BOWL", price: 10, stock: 1, color: "Clay", colorCode: "CLAY", shape: "round" }];
    data.set("gheir-demo-products", JSON.stringify(custom));
    expect(readDemoProducts()).toEqual(custom);
  });

  it("replaces the retired cashier and admin defaults", () => {
    const data = memoryStorage();
    data.set("gheir-local-accounts", JSON.stringify([
      { username: "mariam", password: "cashier", name: "Mariam Adel", role: "cashier" },
      { username: "omar", password: "admin", name: "Omar Nassar", role: "admin" },
    ]));
    expect(readLocalAccounts()).toEqual([
      { username: "ziad", password: "cashier", name: "Ziad", role: "cashier" },
      { username: "ziad", password: "admin", name: "Ziad", role: "admin" },
    ]);
    const custom = [
      { username: "lina", password: "counter", name: "Lina Farid", role: "cashier" },
      { username: "omar", password: "floor", name: "Omar Nassar", role: "admin" },
    ];
    data.set("gheir-local-accounts", JSON.stringify(custom));
    expect(readLocalAccounts()).toEqual(custom);
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
