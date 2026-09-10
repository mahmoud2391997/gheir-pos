export type UserRole = "admin" | "cashier";
export type PaymentMethod = "cash" | "card" | "instapay";
export type AppSection = "register" | "orders" | "catalog" | "sku";

export type ProductRecord = { id: number; name: string; arabicName?: string | null; category: string; baseSku: string; price: number; stock: number; color: string; colorCode: string; shape: string; barcode?: string; active?: boolean };
export type SaleRecord = { id: number; receiptNumber: string; total: number; paymentMethod: PaymentMethod; items: Array<{ name: string; quantity: number; total: number }>; createdAt: string };
export type DashboardSummary = { todaySales: number; completedSales: number; averageOrder: number; lowStockItems: number };
export type SkuRow = { sku: string; name: string; color: string; price: number };

export const appBrand = { name: "GHEIR", descriptor: "Handcrafted design studio", orange: "#ff3c00", green: "#2f3e34", parchment: "#f2ead8", brown: "#5c4033" };
export const categories = ["All", "Tableware", "Decor", "Serving", "Accessories"] as const;
export const paymentLabels: Record<PaymentMethod, string> = { cash: "Cash", card: "Card", instapay: "InstaPay" };
export const paymentDetails: Record<PaymentMethod, string> = { cash: "Collected at counter", card: "Terminal payment", instapay: "QR transfer" };
export const appSections: Array<{ id: AppSection; label: string; caption: string }> = [
  { id: "register", label: "Register", caption: "Sell at the counter" },
  { id: "orders", label: "Orders", caption: "Sales history" },
  { id: "catalog", label: "Catalog", caption: "Products & stock" },
  { id: "sku", label: "SKU Lab", caption: "Print product labels" },
];

export const demoProducts: ProductRecord[] = [
  { id: 1, name: "Sculpted Vessel", arabicName: "إناء منحوت", category: "Tableware", baseSku: "VESSEL", price: 1850, stock: 7, color: "Clay", colorCode: "CLAY", shape: "round" },
  { id: 2, name: "Arc Candleholder", arabicName: "حامل شموع آرك", category: "Decor", baseSku: "ARC", price: 940, stock: 4, color: "Moss", colorCode: "MOSS", shape: "round" },
  { id: 3, name: "Linen Tray", arabicName: "صينية كتان", category: "Serving", baseSku: "TRAY", price: 1260, stock: 12, color: "Sand", colorCode: "SAND", shape: "rect" },
  { id: 4, name: "Stacked Tumbler", arabicName: "كوب متداخل", category: "Tableware", baseSku: "TMBR", price: 620, stock: 19, color: "Smoke", colorCode: "SMOK", shape: "round" },
  { id: 5, name: "Studio Bowl", arabicName: "وعاء الاستوديو", category: "Tableware", baseSku: "BOWL", price: 760, stock: 3, color: "Olive", colorCode: "OLIV", shape: "round" },
  { id: 6, name: "Folded Bookend", arabicName: "مسند كتب مطوي", category: "Accessories", baseSku: "BOOK", price: 480, stock: 9, color: "Rust", colorCode: "RUST", shape: "rect" },
];
export const demoSales: SaleRecord[] = [
  { id: 1, receiptNumber: "GH-20260910-0042", total: 3116, paymentMethod: "card", items: [{ name: "Sculpted Vessel", quantity: 1, total: 1850 }, { name: "Arc Candleholder", quantity: 1, total: 940 }], createdAt: "2026-09-10T15:28:00.000Z" },
  { id: 2, receiptNumber: "GH-20260910-0041", total: 1436, paymentMethod: "cash", items: [{ name: "Linen Tray", quantity: 1, total: 1260 }], createdAt: "2026-09-10T13:05:00.000Z" },
  { id: 3, receiptNumber: "GH-20260910-0040", total: 620, paymentMethod: "instapay", items: [{ name: "Stacked Tumbler", quantity: 1, total: 620 }], createdAt: "2026-09-10T11:42:00.000Z" },
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
export const checkoutNote = "Tax is shown as a configurable 14% placeholder for the demo register.";
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
export const rolePermissions = { cashier: ["register", "orders"], admin: ["register", "orders", "catalog", "sku"] } as const;
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
export function generateSkuRows(input: { baseSku: string; colorCode: string; copies: number; nextSerial: number }, name: string, color: string, price: number): SkuRow[] { return Array.from({ length: Math.max(0, input.copies) }, (_, index) => ({ sku: createProductSku(input.baseSku, input.colorCode, input.nextSerial + index), name, color, price })); }
export function skuLabelCsv(rows: SkuRow[]) { const header = "SKU,Product,Color,Price"; const lines = rows.map((row) => [row.sku, row.name, row.color, row.price.toFixed(2)].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")); return [header, ...lines].join("\n"); }
export function downloadCsv(filename: string, csv: string) { if (typeof window === "undefined") return; const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
export function formatMoney(value: number) { return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value || 0); }
export function formatDate(value: string | Date) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
export function formatTime(value: string | Date) { return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
export function initials(value?: string | null) { return (value || "GHEIR").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
export function colorSwatch(name: string) { return ({ Clay: "#a47d5a", Moss: "#8d9c8a", Sand: "#d9c7a3", Smoke: "#9ba3a2", Olive: "#7e8968", Rust: "#a65e43" } as Record<string, string>)[name] || "#cdbb9c"; }
export function stockLabel(stock: number) { return stock <= 3 ? "Low stock" : stock <= 6 ? "Watch" : "In stock"; }
export function stockTone(stock: number) { return stock <= 3 ? "danger" as const : stock <= 6 ? "warn" as const : "good" as const; }
export function productSearchText(product: ProductRecord) { return `${product.name} ${product.arabicName ?? ""} ${product.baseSku} ${product.colorCode}`.toLowerCase(); }
export function summarizeCart(cart: Array<{ product: ProductRecord; quantity: number }>) { const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0); const tax = Math.round(subtotal * demoTaxRate); return { subtotal, tax, total: subtotal + tax }; }
export function createDemoSale(cart: Array<{ product: ProductRecord; quantity: number }>, paymentMethod: PaymentMethod): SaleRecord { const items = cart.map(({ product, quantity }) => ({ name: product.name, quantity, total: product.price * quantity })); return { id: Date.now(), receiptNumber: `GH-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`, total: items.reduce((sum, item) => sum + item.total, 0), paymentMethod, items, createdAt: new Date().toISOString() }; }
export function buildReceiptMarkup(sale: SaleRecord) { return `<h1>GHEIR</h1><p>${sale.receiptNumber}<br/>${formatDate(sale.createdAt)} · ${formatTime(sale.createdAt)}</p><table>${sale.items.map((item) => `<tr><td>${item.quantity} × ${item.name}</td><td style="text-align:right">${formatMoney(item.total)}</td></tr>`).join("")}</table><div class="total">TOTAL <span style="float:right">${formatMoney(sale.total)}</span></div><p style="margin-top:28px">Thank you for choosing GHEIR.</p>`; }
export function openPrintWindow(title: string, html: string) { if (typeof window === "undefined") return; const printWindow = window.open("", "_blank", "width=420,height=680"); if (!printWindow) return; printWindow.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:18px;width:280px}table{width:100%;border-collapse:collapse}td{padding:4px 0;border-bottom:1px dotted #aaa;font-size:12px}.total{font-weight:700;font-size:15px;margin-top:12px}h1{letter-spacing:.12em;font-size:21px;text-align:center;margin:0 0 4px}p{font-size:11px;color:#555;text-align:center;margin:4px 0 16px}</style></head><body>${html}</body></html>`); printWindow.document.close(); printWindow.focus(); printWindow.print(); }
export function roleCanAccess(role: UserRole, section: AppSection) { return role === "admin" || section === "register" || section === "orders"; }
export function persistDemoSales(sales: SaleRecord[]) { try { localStorage.setItem("gheir-demo-sales", JSON.stringify(sales)); } catch {} }
export function readDemoSales() { try { return JSON.parse(localStorage.getItem("gheir-demo-sales") || "null") as SaleRecord[] || demoSales; } catch { return demoSales; } }
export function persistDemoProducts(products: ProductRecord[]) { try { localStorage.setItem("gheir-demo-products", JSON.stringify(products)); } catch {} }
export function readDemoProducts() { try { return JSON.parse(localStorage.getItem("gheir-demo-products") || "null") as ProductRecord[] || demoProducts; } catch { return demoProducts; } }
export function resetDemoData() { try { localStorage.removeItem("gheir-demo-products"); localStorage.removeItem("gheir-demo-sales"); } catch {} }
export function createLabelRows(products: ProductRecord[], copiesPerProduct = 1) { return products.flatMap((product) => generateSkuRows({ baseSku: product.baseSku, colorCode: product.colorCode, copies: copiesPerProduct, nextSerial: 1 }, product.name, product.color, product.price)); }
export function toCsvFilename(prefix = "gheir-skus") { return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`; }
export function getTodaySales(sales: SaleRecord[]) { return sales.reduce((sum, sale) => sum + sale.total, 0); }
export function getAverageOrder(sales: SaleRecord[]) { return sales.length ? Math.round(getTodaySales(sales) / sales.length) : 0; }
export function makeDashboard(sales: SaleRecord[], products: ProductRecord[]): DashboardSummary { return { todaySales: getTodaySales(sales), completedSales: sales.length, averageOrder: getAverageOrder(sales), lowStockItems: products.filter((product) => product.stock <= 3).length }; }
export function getSectionTitle(section: AppSection) { return appSections.find((item) => item.id === section)?.label ?? "Register"; }
export function sectionIsAdminOnly(section: AppSection) { return section === "catalog" || section === "sku"; }
export function getRoleGreeting(role: UserRole) { return role === "admin" ? "Keep the shelf clear and the identity consistent." : "A calm counter for a considered purchase."; }
export function safeTrim(value: string) { return value.trim().replace(/\s+/g, " "); }
export function asPositiveInt(value: string, fallback = 1) { const number = Number.parseInt(value, 10); return Number.isFinite(number) && number > 0 ? number : fallback; }
export function newUnitSku(product: ProductRecord, serial = 7) { return createProductSku(product.baseSku, product.colorCode, serial); }
export function makeBarcodeText(sku: string) { return sku.replaceAll("-", ""); }
export function hasPermission(role: UserRole, section: AppSection) { return roleCanAccess(role, section); }
export function normalizeProduct(record: Partial<ProductRecord> & { id: number; name: string }): ProductRecord { return { id: record.id, name: record.name, arabicName: record.arabicName ?? null, category: record.category ?? "Uncategorized", baseSku: record.baseSku ?? "ITEM", price: Number(record.price ?? 0), stock: Number(record.stock ?? 0), color: record.color ?? "Natural", colorCode: record.colorCode ?? "NAT", shape: record.shape ?? "handmade", active: record.active ?? true }; }
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
