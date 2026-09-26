export type UserRole = "admin" | "cashier";
export type PaymentMethod = "cash" | "card" | "instapay";
export type AppSection = "register" | "orders" | "catalog" | "sku" | "reports";

export type ProductRecord = { id: number; name: string; arabicName?: string | null; englishName?: string | null; category: string; categoryAr?: string | null; baseSku: string; price: number; stock: number; color: string; colorArabic?: string | null; colorCode: string; shape: string; barcode?: string; active?: boolean };
export type SaleRecord = { id: number; receiptNumber: string; total: number; discount: number; tax: number; tendered?: number | null; change?: number | null; paymentMethod: PaymentMethod; items: Array<{ name: string; arabicName?: string | null; quantity: number; total: number }>; createdAt: string };
export type DashboardSummary = { todaySales: number; completedSales: number; averageOrder: number; lowStockItems: number };
export type SkuRow = { sku: string; name: string; arabicName?: string | null; color: string; colorArabic?: string | null; price: number };

export const appBrand = { name: "GHEIR", descriptor: "Handcrafted design studio", green: "#2f3e34", parchment: "#f2ead8", brown: "#5c4033" };
export const categories = ["All", "Tableware", "Decor", "Serving", "Accessories"] as const;
export const paymentLabels: Record<PaymentMethod, string> = { cash: "Cash", card: "Card", instapay: "InstaPay" };
export const paymentDetails: Record<PaymentMethod, string> = { cash: "Collected at counter", card: "Terminal payment", instapay: "QR transfer" };
export const appSections: Array<{ id: AppSection; label: string; arabicLabel: string; caption: string; arabicCaption: string }> = [
  { id: "register", label: "Register", arabicLabel: "نقطة البيع", caption: "Sell at the counter", arabicCaption: "إتمام المبيعات" },
  { id: "orders", label: "Orders", arabicLabel: "الطلبات", caption: "Sales history", arabicCaption: "سجل المبيعات" },
  { id: "catalog", label: "Catalog", arabicLabel: "المنتجات", caption: "Products & stock", arabicCaption: "المنتجات والمخزون" },
  { id: "sku", label: "SKU Lab", arabicLabel: "معمل الأكواد", caption: "Export product labels", arabicCaption: "تصدير ملصقات المنتجات" },
  { id: "reports", label: "Reports", arabicLabel: "التقارير", caption: "Sales and stock", arabicCaption: "المبيعات والمخزون" },
];

export const demoProducts: ProductRecord[] = [
  { id: 1, name: "Sculpted Vessel", arabicName: "إناء منحوت", category: "Tableware", categoryAr: "أطباق", baseSku: "VESSEL", price: 1850, stock: 7, color: "Clay", colorArabic: "طين", colorCode: "CLAY", shape: "round" },
  { id: 2, name: "Arc Candleholder", arabicName: "حامل شموع آرك", category: "Decor", categoryAr: "ديكور", baseSku: "ARC", price: 940, stock: 4, color: "Moss", colorArabic: "طحلب", colorCode: "MOSS", shape: "round" },
  { id: 3, name: "Linen Tray", arabicName: "صينية كتان", category: "Serving", categoryAr: "تقديم", baseSku: "TRAY", price: 1260, stock: 12, color: "Sand", colorArabic: "رملي", colorCode: "SAND", shape: "rect" },
  { id: 4, name: "Stacked Tumbler", arabicName: "كوب متداخل", category: "Tableware", categoryAr: "أطباق", baseSku: "TMBR", price: 620, stock: 19, color: "Smoke", colorArabic: "دخاني", colorCode: "SMOK", shape: "round" },
  { id: 5, name: "Studio Bowl", arabicName: "وعاء الاستوديو", category: "Tableware", categoryAr: "أطباق", baseSku: "BOWL", price: 760, stock: 3, color: "Olive", colorArabic: "زيتوني", colorCode: "OLIV", shape: "round" },
  { id: 6, name: "Folded Bookend", arabicName: "مسند كتب مطوي", category: "Accessories", categoryAr: "إكسسوارات", baseSku: "BOOK", price: 480, stock: 9, color: "Rust", colorArabic: "صدئ", colorCode: "RUST", shape: "rect" },
  { id: 7, name: "Ember Mug", arabicName: "كوب الجمرة", category: "Tableware", categoryAr: "أطباق", baseSku: "MUG", price: 540, stock: 11, color: "Char", colorArabic: "فحمي", colorCode: "CHAR", shape: "round" },
  { id: 8, name: "Palm Platter", arabicName: "طبق النخيل", category: "Serving", categoryAr: "تقديم", baseSku: "PLTR", price: 1490, stock: 6, color: "Terracotta", colorArabic: "طيني", colorCode: "TERR", shape: "round" },
  { id: 9, name: "Copper Vase", arabicName: "مزهرية نحاسية", category: "Decor", categoryAr: "ديكور", baseSku: "VASE", price: 2190, stock: 2, color: "Copper", colorArabic: "نحاسي", colorCode: "COPP", shape: "round" },
  { id: 10, name: "Woven Basket", arabicName: "سلة منسوجة", category: "Decor", categoryAr: "ديكور", baseSku: "BSKT", price: 830, stock: 5, color: "Wheat", colorArabic: "قمحي", colorCode: "WHET", shape: "rect" },
  { id: 11, name: "Stone Cup", arabicName: "كوب حجري", category: "Tableware", categoryAr: "أطباق", baseSku: "CUP", price: 410, stock: 16, color: "Slate", colorArabic: "أردوازي", colorCode: "SLAT", shape: "round" },
  { id: 12, name: "Ripple Carafe", arabicName: "إبريق التموجات", category: "Tableware", categoryAr: "أطباق", baseSku: "CRF", price: 1320, stock: 4, color: "Ocean", colorArabic: "محيطي", colorCode: "OCEA", shape: "round" },
  { id: 13, name: "Moss Saucer", arabicName: "صحن الطحالب", category: "Tableware", categoryAr: "أطباق", baseSku: "SAUR", price: 260, stock: 14, color: "Fern", colorArabic: "سرخسي", colorCode: "FERN", shape: "round" },
  { id: 14, name: "Sun Brush Hook", arabicName: "خطاف الشمس", category: "Accessories", categoryAr: "إكسسوارات", baseSku: "HOK", price: 390, stock: 8, color: "Brass", colorArabic: "نحاس", colorCode: "BRAS", shape: "rect" },
  { id: 15, name: "Sand Urn", arabicName: "جرة الرمل", category: "Serving", categoryAr: "تقديم", baseSku: "URN", price: 1720, stock: 3, color: "Biscuit", colorArabic: "بسكويتي", colorCode: "BISC", shape: "round" },
  { id: 16, name: "Cloud Diffuser", arabicName: "ناشر السحابة", category: "Decor", categoryAr: "ديكور", baseSku: "DIFR", price: 980, stock: 7, color: "Pearl", colorArabic: "لؤلؤي", colorCode: "PRL", shape: "round" },
  { id: 17, name: "Dune Coaster", arabicName: "ماسك كثيب", category: "Tableware", categoryAr: "أطباق", baseSku: "CST", price: 150, stock: 22, color: "Dune", colorArabic: "كثبان", colorCode: "DUNE", shape: "round" },
  { id: 18, name: "Tidal Plate", arabicName: "صينية المد", category: "Serving", categoryAr: "تقديم", baseSku: "PLAT", price: 1560, stock: 5, color: "Blue", colorArabic: "أزرق", colorCode: "BLUE", shape: "round" },
  { id: 19, name: "Ivy Votives", arabicName: "شمعدانات اللبلاب", category: "Decor", categoryAr: "ديكور", baseSku: "VOT", price: 720, stock: 9, color: "Green", colorArabic: "أخضر", colorCode: "GREN", shape: "round" },
  { id: 20, name: "Linea Cuff", arabicName: "سوار لينيا", category: "Accessories", categoryAr: "إكسسوارات", baseSku: "CUFF", price: 1860, stock: 2, color: "Noir", colorArabic: "أسود", colorCode: "NOIR", shape: "round" },
];
export const demoSales: SaleRecord[] = [
  { id: 1, receiptNumber: "GH-20260910-0042", total: 3116, discount: 0, tax: 0, paymentMethod: "card", items: [{ name: "Sculpted Vessel", quantity: 1, total: 1850 }, { name: "Arc Candleholder", quantity: 1, total: 940 }], createdAt: "2026-09-10T15:28:00.000Z" },
  { id: 2, receiptNumber: "GH-20260910-0041", total: 1436, discount: 0, tax: 0, paymentMethod: "cash", items: [{ name: "Linen Tray", quantity: 1, total: 1260 }], createdAt: "2026-09-10T13:05:00.000Z" },
  { id: 3, receiptNumber: "GH-20260910-0040", total: 620, discount: 0, tax: 0, paymentMethod: "instapay", items: [{ name: "Stacked Tumbler", quantity: 1, total: 620 }], createdAt: "2026-09-10T11:42:00.000Z" },
];
export const demoDashboard: DashboardSummary = { todaySales: 12640, completedSales: 18, averageOrder: 702, lowStockItems: 2 };
export const dashboardBars = [{ day: "Mon", value: 4600 }, { day: "Tue", value: 7100 }, { day: "Wed", value: 5200 }, { day: "Thu", value: 8400 }, { day: "Fri", value: 6300 }, { day: "Sat", value: 10200 }, { day: "Sun", value: 12640 }];
export const brandQuote = "What is made by hand can never be truly copied.";
export const demoRoleStorageKey = "gheir-demo-role";
export const demoTaxRate = 0.14;
export const skuFormat = "BASE-COLOR-0001";
export const storeName = "GHEIR showroom";
export const storeAddress = "Cairo · New Cairo";
export const appVersion = "v0.1 / register preview";
export const appFooter = "GHEIR / 2026 · Store register";
export const scannerMode = "keyboard wedge";
export const printerPaper = "80mm thermal";
export const architectureCopy = "Node.js + tRPC + Drizzle now; Electron desktop shell next.";
export const browserHardwareNote = "Browser preview uses keyboard-wedge scanning and the system print dialog.";
export const electronHardwareNote = "Electron can replace these adapters with native scanner and thermal-printer bridges without changing the POS screens.";
export const checkoutNote = "Discounts and taxes are entered manually at the counter.";
export const skuFlowCopy = "Select products already on the shelf and export their existing SKUs for your label printer.";
export const printFlowCopy = "CSV export is ready for a SKU printer; receipt print uses the system print dialog.";
export const scannerFlowCopy = "Scan a full unique SKU to resolve the exact physical copy at checkout.";
export const roleCopy: Record<UserRole, { label: string; detail: string }> = { cashier: { label: "Cashier", detail: "Register + orders" }, admin: { label: "Admin", detail: "Full store controls" } };
export const demoUsers = [{ name: "Mariam Adel", role: "cashier" as UserRole, status: "On register" }, { name: "Omar Nassar", role: "admin" as UserRole, status: "Full access" }];
export const hardwareNotes = [{ title: "Scanner ready", detail: "USB / Bluetooth keyboard-wedge scanners work out of the box." }, { title: "Printer ready", detail: "Receipts use the browser print bridge today; Electron can map to thermal printers next." }, { title: "Electron path", detail: "The UI stays web-first with a clean hardware adapter seam for desktop packaging." }];
export const keyboardShortcuts = [{ key: "F2", action: "Focus scanner" }, { key: "F4", action: "Open payment" }, { key: "⌘ / Ctrl + P", action: "Print receipt" }] as const;
export const skuExampleRows: SkuRow[] = [{ sku: "VASE-CLAY-0007", name: "Sculpted Vessel", color: "Clay", price: 1850 }, { sku: "VASE-CLAY-0008", name: "Sculpted Vessel", color: "Clay", price: 1850 }, { sku: "VASE-MOSS-0001", name: "Sculpted Vessel", color: "Moss", price: 1850 }];
export const defaultRole: UserRole = "cashier";
export const scannerPlaceholder = "Scan a SKU or type a product name…";
export const noPermissionCopy = "Your cashier role can sell and view orders. Ask an admin to manage catalog or labels.";
export const productUnitRule = "A product family can have multiple colors, and each physical copy gets its own serialized SKU.";
export const skuPatternDescription = "BASE-COLOR-#### · Example: VASE-CLAY-0007";
export const adminReadyCopy = "Admin controls are visible in this preview role.";
export const cashierReadyCopy = "Cashier register is ready for scanning.";
export const printReadyCopy = "Label CSV is ready for a SKU printer workflow.";
export const receiptReadyCopy = "Receipt is ready for the thermal printer.";
export const emptyOrdersCopy = "Completed sales will settle here after the first checkout.";
export const emptySkuCopy = "Add products to the catalog first, then select them here to export their existing SKUs.";
export const emptyCatalogCopy = "Product families and their physical copies will appear here.";
export const footerMeta = `2026.09 · ${printerPaper} · ${scannerMode}`;
export const rolePermissions = { cashier: ["register", "orders"], admin: ["register", "orders", "catalog", "sku", "reports"] } as const;
export const appName = "GHEIR POS";
export const currency = "EGP";
export const taxRate = demoTaxRate;
export const appDescription = "Branded retail point-of-sale for GHEIR.";
export const projectStack = "Node.js + React + tRPC + Drizzle + Electron-ready";
export const roadmap = ["Validate workflows", "Connect database", "Package Electron shell", "Bridge scanner + printer", "Add offline sync"] as const;

export function normalizeSkuPart(value: string) { return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
export function generateFamilyCode(name: string) { return normalizeSkuPart(name).split("-").filter(Boolean).map((part) => part[0]).join("").slice(0, 8) || "ITEM"; }
export function generateColorCode(color: string) { return normalizeSkuPart(color).replaceAll("-", "").slice(0, 8) || "NAT"; }
export function createProductSku(baseSku: string, colorCode: string, serial: number) { return [normalizeSkuPart(baseSku), normalizeSkuPart(colorCode), String(serial).padStart(4, "0")].filter(Boolean).join("-"); }
export function createGeneratedProductSku(name: string, color: string, serial: number) { return createProductSku(generateFamilyCode(name), generateColorCode(color), serial); }
export function createGeneratedBarcode(name: string, color: string, serial: number) { return makeBarcodeText(createGeneratedProductSku(name, color, serial)); }
export function generateSkuRows(input: { baseSku: string; colorCode: string; copies: number; nextSerial: number }, name: string, color: string, price: number, arabicName?: string | null, colorArabic?: string | null): SkuRow[] { return Array.from({ length: Math.max(0, input.copies) }, (_, index) => ({ sku: createProductSku(input.baseSku, input.colorCode, input.nextSerial + index), name, arabicName: arabicName ?? null, color, colorArabic: colorArabic ?? null, price })); }
export function skuLabelCsv(rows: SkuRow[]) { const header = "SKU,Product English,Product Arabic,Color English,Color Arabic,Price"; const lines = rows.map((row) => [row.sku, row.name, row.arabicName ?? "", row.color, row.colorArabic ?? "", row.price.toFixed(2)].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")); return [header, ...lines].join("\n"); }
export function downloadCsv(filename: string, csv: string) { if (typeof window === "undefined") return; const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 100); }
export function productCsv(products: ProductRecord[]) { const header = "Name,Arabic Name,Category,Arabic Category,Price,Stock,Color,Color Arabic,Color Code,Base SKU,Barcode,Shape"; const lines = products.map((product) => [product.name, product.arabicName ?? "", product.category, product.categoryAr ?? "", product.price, product.stock, product.color, product.colorArabic ?? "", product.colorCode, product.baseSku, product.barcode ?? "", product.shape].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")); return [header, ...lines].join("\n"); }
export function productCsvTemplate() { return "Name,Arabic Name,Category,Arabic Category,Price,Stock,Color,Color Arabic,Color Code,Base SKU,Barcode,Shape\nStoneware cup,كوب فخاري,Tableware,أطباق,1200,5,Clay,طين,CLAY,CUP,,round"; }
export function parseProductCsv(csv: string): ProductRecord[] { const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean); if (lines.length < 2) return []; const parse = (line: string) => line.match(/(?:^|,)\s*(?:"((?:[^"]|"")*)"|([^,]*))/g)?.map((part) => part.replace(/^,?\s*/, "").replace(/^"|"$/g, "").replaceAll('""', '"').trim()) ?? []; const header = parse(lines[0]).map((value) => value.trim().toLowerCase()); const isHeader = header.some((value) => ["name", "arabic name", "category", "price", "stock", "color"].includes(value)); const col = (labels: string[]) => { const index = labels.map((label) => header.indexOf(label)).find((candidate) => candidate !== -1); return index ?? -1; }; const nameAt = isHeader ? col(["name"]) : 0; const arabicAt = isHeader ? col(["arabic name"]) : 1; const categoryAt = isHeader ? col(["category"]) : 2; const categoryArAt = isHeader ? col(["arabic category"]) : -1; const priceAt = isHeader ? col(["price"]) : 3; const stockAt = isHeader ? col(["stock"]) : 4; const colorAt = isHeader ? col(["color"]) : 5; const colorArAt = isHeader ? col(["color arabic"]) : -1; const colorCodeAt = isHeader ? col(["color code"]) : 6; const baseSkuAt = isHeader ? col(["base sku"]) : 7; const barcodeAt = isHeader ? col(["barcode"]) : 8; const shapeAt = isHeader ? col(["shape"]) : 9; const at = (values: string[], index: number) => index >= 0 && index < values.length ? safeTrim(values[index]) : ""; return lines.slice(isHeader ? 1 : 0).map((line, index) => { const values = parse(line); const name = at(values, nameAt); const color = at(values, colorAt) || "Natural"; if (!name) return null; return normalizeProduct({ id: Date.now() + index, name, arabicName: at(values, arabicAt) || null, category: at(values, categoryAt) || "Uncategorized", categoryAr: at(values, categoryArAt) || null, price: Number(at(values, priceAt)) || 0, stock: Number(at(values, stockAt)) || 0, color, colorArabic: at(values, colorArAt) || null, colorCode: at(values, colorCodeAt) || generateColorCode(color), baseSku: at(values, baseSkuAt) || generateFamilyCode(name), barcode: at(values, barcodeAt) || createGeneratedProductSku(name, color, 1).replaceAll("-", ""), shape: at(values, shapeAt) || "round" }); }).filter((product): product is ProductRecord => Boolean(product)); }
export function formatMoney(value: number, locale = "en-EG") { return new Intl.NumberFormat(locale, { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value || 0); }
export function formatDate(value: string | Date, locale = "en") { return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
export function formatTime(value: string | Date, locale = "en") { return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
export function initials(value?: string | null) { return (value || "GHEIR").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
export function colorSwatch(name: string) { return ({ Clay: "#a47d5a", Moss: "#8d9c8a", Sand: "#d9c7a3", Smoke: "#9ba3a2", Olive: "#7e8968", Rust: "#a65e43" } as Record<string, string>)[name] || "#cdbb9c"; }
export function stockLabel(stock: number) { return stock <= 3 ? "Low stock" : stock <= 6 ? "Watch" : "In stock"; }
export function stockTone(stock: number) { return stock <= 3 ? "danger" as const : stock <= 6 ? "warn" as const : "good" as const; }
export function productSearchText(product: ProductRecord) { return `${product.name} ${product.arabicName ?? ""} ${product.category} ${product.categoryAr ?? ""} ${product.color} ${product.colorArabic ?? ""} ${product.baseSku} ${product.colorCode}`.toLowerCase(); }
export function summarizeCart(cart: Array<{ product: ProductRecord; quantity: number }>) { const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0); const tax = Math.round(subtotal * demoTaxRate); return { subtotal, tax, total: subtotal + tax }; }
export function createDemoSale(cart: Array<{ product: ProductRecord; quantity: number }>, paymentMethod: PaymentMethod, adjustments?: { discount?: number; tax?: number; tendered?: number }): SaleRecord { const items = cart.map(({ product, quantity }) => ({ name: product.name, arabicName: product.arabicName ?? null, quantity, total: product.price * quantity })); const subtotal = items.reduce((sum, item) => sum + item.total, 0); const discount = Math.max(0, adjustments?.discount ?? 0); const tax = Math.max(0, adjustments?.tax ?? 0); const total = Math.max(0, subtotal - discount + tax); const tendered = adjustments?.tendered != null ? Math.max(0, adjustments.tendered) : undefined; const change = tendered != null ? Math.max(0, tendered - total) : undefined; return { id: Date.now(), receiptNumber: `GH-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`, total, discount, tax, tendered, change, paymentMethod, items, createdAt: new Date().toISOString() }; }
export function buildReceiptMarkup(sale: SaleRecord, logoUri?: string) { const logo = logoUri ? `<img class="logo" src="${logoUri}" alt="GHEIR" />` : ""; const discountRow = (sale.discount ?? 0) > 0 ? `<tr><td>DISCOUNT</td><td style="text-align:right">-${formatMoney(sale.discount ?? 0)}</td></tr>` : ""; const taxRow = (sale.tax ?? 0) > 0 ? `<tr><td>TAX</td><td style="text-align:right">${formatMoney(sale.tax ?? 0)}</td></tr>` : ""; const paidRow = sale.tendered != null ? `<div class="total">PAID <span style="float:right">${formatMoney(sale.tendered)}</span></div>` : ""; const changeRow = sale.change != null ? `<div class="total">CHANGE <span style="float:right">${formatMoney(sale.change)}</span></div>` : ""; return `<div class="receipt">${logo}<h1>GHEIR</h1><p>${sale.receiptNumber}<br/>${formatDate(sale.createdAt)} · ${formatTime(sale.createdAt)}</p><hr/><table>${sale.items.map((item) => `<tr><td>${item.quantity} × ${item.name}${item.arabicName ? `<br/><span style="font-weight:normal">${item.arabicName}</span>` : ""}</td><td style="text-align:right">${formatMoney(item.total)}</td></tr>`).join("")}${discountRow}${taxRow}</table><div class="total">TOTAL <span style="float:right">${formatMoney(sale.total)}</span></div>${paidRow}${changeRow}<hr/><p class="foot">Thank you for choosing GHEIR.</p></div>`; }
export function openPrintWindow(title: string, html: string) {
  if (typeof window === "undefined") return;

  const documentHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${title}</title><style>@page{margin:0}*{box-sizing:border-box}body{font-family:'Courier New',Courier,monospace;width:302px;margin:0 auto;padding:16px 0;background:#fff;color:#111;font-size:12px}.receipt{text-align:center}.logo{display:block;width:auto;max-width:140px;max-height:42px;margin:0 auto 6px}.logo img{-o-object-fit:contain;object-fit:contain}h1{font-family:Georgia,serif;letter-spacing:.14em;font-size:22px;text-align:center;margin:6px 0 2px}p{font-size:11px;color:#333;text-align:center;margin:4px 0}hr{border:none;border-top:1px dashed #999;margin:10px 0}table{width:100%;border-collapse:collapse;text-align:left}td{padding:4px 0;font-size:12px;vertical-align:top}.total{font-weight:700;font-size:15px;margin-top:10px;text-align:left}.foot{font-size:11px;text-align:center}</style></head><body>${html}</body></html>`;

  const electronPrint = (window as any)?.gheirPrint?.printReceipt as
    | ((input: { title: string; documentHtml: string }) => Promise<unknown>)
    | undefined;
  if (typeof electronPrint === "function") {
    void electronPrint({ title, documentHtml });
    return;
  }

  const printWindow = window.open("", "_blank", "width=440,height=700");
  if (!printWindow) return;
  printWindow.document.write(documentHtml);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
export function roleCanAccess(role: UserRole, section: AppSection) { return role === "admin" || section === "register" || section === "orders"; }
export function persistDemoSales(sales: SaleRecord[]) { try { localStorage.setItem("gheir-demo-sales", JSON.stringify(sales)); } catch {} }
export function readDemoSales() { try { return JSON.parse(localStorage.getItem("gheir-demo-sales") || "null") as SaleRecord[] || demoSales; } catch { return demoSales; } }
export function persistDemoProducts(products: ProductRecord[]) { try { localStorage.setItem("gheir-demo-products", JSON.stringify(products)); } catch {} }
export function readDemoProducts() { try { return JSON.parse(localStorage.getItem("gheir-demo-products") || "null") as ProductRecord[] || demoProducts; } catch { return demoProducts; } }
export function resetDemoData() { try { localStorage.removeItem("gheir-demo-products"); localStorage.removeItem("gheir-demo-sales"); } catch {} }
export function createLabelRows(products: ProductRecord[], copiesPerProduct = 1) { return products.flatMap((product) => generateSkuRows({ baseSku: product.baseSku, colorCode: product.colorCode, copies: copiesPerProduct, nextSerial: 1 }, product.name, product.color, product.price, product.arabicName, product.colorArabic)); }
export function toCsvFilename(prefix = "gheir-skus") { return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`; }
export function getTodaySales(sales: SaleRecord[]) { return sales.reduce((sum, sale) => sum + sale.total, 0); }
export function getAverageOrder(sales: SaleRecord[]) { return sales.length ? Math.round(getTodaySales(sales) / sales.length) : 0; }
export function makeDashboard(sales: SaleRecord[], products: ProductRecord[]): DashboardSummary { return { todaySales: getTodaySales(sales), completedSales: sales.length, averageOrder: getAverageOrder(sales), lowStockItems: products.filter((product) => product.stock <= 3).length }; }
export function getSectionTitle(section: AppSection) { return appSections.find((item) => item.id === section)?.label ?? "Register"; }
export function sectionIsAdminOnly(section: AppSection) { return section === "catalog" || section === "sku" || section === "reports"; }
export function getRoleGreeting(role: UserRole) { return role === "admin" ? "Keep the shelf clear and the identity consistent." : "A calm counter for a considered purchase."; }
export function safeTrim(value: string) { return value.trim().replace(/\s+/g, " "); }
export function asPositiveInt(value: string, fallback = 1) { const number = Number.parseInt(value, 10); return Number.isFinite(number) && number > 0 ? number : fallback; }
export function newUnitSku(product: ProductRecord, serial = 7) { return createProductSku(product.baseSku, product.colorCode, serial); }
export function makeBarcodeText(sku: string) { return sku.replaceAll("-", ""); }
export function hasPermission(role: UserRole, section: AppSection) { return roleCanAccess(role, section); }
export function normalizeProduct(record: Partial<ProductRecord> & { id: number; name: string }): ProductRecord { return { id: record.id, name: record.name, arabicName: record.arabicName ?? null, category: record.category ?? "Uncategorized", categoryAr: record.categoryAr ?? null, baseSku: record.baseSku ?? "ITEM", price: Number(record.price ?? 0), stock: Number(record.stock ?? 0), color: record.color ?? "Natural", colorArabic: record.colorArabic ?? null, colorCode: record.colorCode ?? "NAT", shape: record.shape ?? "handmade", active: record.active ?? true }; }
export function getLowStock(products: ProductRecord[]) { return products.filter((product) => product.stock <= 3); }
export function isPaymentMethod(value: string): value is PaymentMethod { return ["cash", "card", "instapay"].includes(value); }
export function makeSkuFile(rows: SkuRow[]) { return { filename: toCsvFilename(), csv: skuLabelCsv(rows), count: rows.length }; }
export function formatSkuSerial(serial: number) { return String(serial).padStart(4, "0"); }
export function buildFamilyLabel(baseSku: string, colorCode: string) { return `${normalizeSkuPart(baseSku)}-${normalizeSkuPart(colorCode)}`; }
export function getNextSerial(rows: SkuRow[]) { return rows.reduce((max, row) => Math.max(max, Number(row.sku.split("-").at(-1) || 0)), 0) + 1; }
export function sortByLatest<T extends { createdAt: string }>(items: T[]) { return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
export function sortByName<T extends { name: string }>(items: T[]) { return [...items].sort((a, b) => a.name.localeCompare(b.name)); }
export function skuToBarcodeValue(sku: string) { return sku.replace(/[^A-Za-z0-9]/g, ""); }
export function isAdmin(role: UserRole) { return role === "admin"; }
export function isCashier(role: UserRole) { return role === "cashier"; }
export function initialsForRole(role: UserRole) { return role === "admin" ? "OM" : "MA"; }
export function roleBadgeClass(role: UserRole) { return role === "admin" ? "bg-[#e5d5b5] text-[#5c4033]" : "bg-[#d8e2d5] text-[#2f3e34]"; }
export function getCategoryColor(category: string) { return ({ Tableware: "#d9c7a3", Decor: "#b5c1ad", Serving: "#a47d5a", Accessories: "#e5d5b5" } as Record<string, string>)[category] || "#d9c7a3"; }
export function isLikelySku(value: string) { return /^[A-Z0-9]+-[A-Z0-9]+-\d{4}$/.test(value.trim().toUpperCase()); }
export function parseSku(value: string) { const [baseSku, colorCode, serial] = value.trim().toUpperCase().split("-"); return { baseSku, colorCode, serial: Number(serial) }; }
export const taxLabel = "VAT 14%";
export const demoLabel = "Preview mode";
export const onlineStatus = "Online";
export const activeStatus = "Active";
export const allProductsLabel = "All pieces";
export const noResultsLabel = "No matching pieces";
export const noCartLabel = "Your counter is clear. Scan or choose a piece to begin.";
export const registerTitle = "Make a sale";
export const ordersTitle = "Sales journal";
export const catalogTitle = "Product shelf";
export const skuTitle = "SKU file exporter";
export const registerEyebrow = "GHEIR / Register";
export const ordersEyebrow = "GHEIR / Orders";
export const catalogEyebrow = "GHEIR / Catalog";
export const skuEyebrow = "GHEIR / SKU Lab";
export const skuExportLabel = "Export label run";
export const checkoutLabel = "Complete sale";
export const printReceiptLabel = "Print receipt";
export const skuPrintHelp = "Download CSV now; native label printing comes with the Electron bridge.";
export const scannerHelp = "Keep the scanner focused; a trailing Enter adds the matching item.";
export const roleHelp = "Use the toggle to preview each role. Backend procedures enforce permissions when signed in.";
export const productFamilyHelp = "Products are grouped by family SKU; individual copies are tracked by their full SKU.";
export const receiptHelp = "Receipts are browser-printable today and thermal-printer ready for Electron.";
export const settingsCopy = "Settings and staff management belong to the admin role.";
export const userRoleCopy = "Cashiers can sell and review orders. Admins can also manage catalog and SKU labels.";
export const legalDisclaimer = "Demo-only totals until tax and payment rules are configured for the store.";
export const appTitle = "GHEIR POS · Store register";
export const appFooterMeta = `${appVersion} · ${printerPaper} · ${scannerMode}`;
export const schemaCapabilities = ["roles", "products", "variants", "units", "sales", "print-jobs"] as const;
export const electronCapabilities = ["native-scanner", "thermal-printer", "offline-cache"] as const;
export const readyForElectron = true;
export const testableExampleSku = createProductSku("vase", "clay", 7);
