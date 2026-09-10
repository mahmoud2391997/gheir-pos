import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, inventoryUnits, productVariants, products, saleItems, sales, skuPrintJobs, users } from "../drizzle/schema";
import { createProductSku } from "../shared/sku";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn };
  if (user.role) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listProducts() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ product: products, variant: productVariants }).from(products).leftJoin(productVariants, eq(productVariants.productId, products.id)).where(eq(products.active, 1));
  const grouped = new Map<number, { product: typeof products.$inferSelect; variants: Array<typeof productVariants.$inferSelect> }>();
  for (const row of rows) {
    const current = grouped.get(row.product.id) ?? { product: row.product, variants: [] };
    if (row.variant) current.variants.push(row.variant);
    grouped.set(row.product.id, current);
  }
  const stockRows = await db.select({ productId: inventoryUnits.productId, count: sql<number>`count(*)` }).from(inventoryUnits).where(eq(inventoryUnits.status, "available")).groupBy(inventoryUnits.productId);
  const stockByProduct = new Map(stockRows.map((row) => [row.productId, Number(row.count)]));
  return Array.from(grouped.values()).map(({ product, variants }) => ({ ...product, price: Number(product.price), stock: stockByProduct.get(product.id) ?? 0, color: variants[0]?.color ?? "Natural", colorCode: variants[0]?.colorCode ?? "NAT", variants }));
}

export async function getDashboard() {
  const db = await getDb();
  if (!db) return { todaySales: 0, completedSales: 0, averageOrder: 0, lowStockItems: 0 };
  const salesRows = await db.select({ total: sales.total }).from(sales).where(eq(sales.status, "completed"));
  const available = await db.select({ productId: inventoryUnits.productId, count: sql<number>`count(*)` }).from(inventoryUnits).where(eq(inventoryUnits.status, "available")).groupBy(inventoryUnits.productId);
  const todaySales = salesRows.reduce((sum, row) => sum + Number(row.total), 0);
  return { todaySales, completedSales: salesRows.length, averageOrder: salesRows.length ? Math.round(todaySales / salesRows.length) : 0, lowStockItems: available.filter((row) => Number(row.count) <= 3).length };
}

export async function listSales(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(limit);
  const items = await db.select().from(saleItems);
  return rows.map((sale) => ({ ...sale, subtotal: Number(sale.subtotal), tax: Number(sale.tax), total: Number(sale.total), items: items.filter((item) => item.saleId === sale.id).map((item) => ({ name: item.nameSnapshot, quantity: item.quantity, total: Number(item.lineTotal) })) }));
}

export async function createProductWithVariant(input: { name: string; arabicName?: string; category: string; baseSku: string; price: number; color: string; colorCode: string; copies: number }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(products).values({ name: input.name, arabicName: input.arabicName ?? null, category: input.category, baseSku: input.baseSku, price: input.price.toFixed(2) });
  const productId = Number(result[0].insertId);
  const variantResult = await db.insert(productVariants).values({ productId, color: input.color, colorCode: input.colorCode, nextSerial: input.copies + 1 });
  const variantId = Number(variantResult[0].insertId);
  const units = Array.from({ length: input.copies }, (_, index) => ({ productId, variantId, sku: createProductSku(input.baseSku, input.colorCode, index + 1), serial: index + 1 }));
  if (units.length) await db.insert(inventoryUnits).values(units);
  return { productId, variantId, count: units.length };
}

export async function createSale(input: { cashierId: number; customerName?: string | null; subtotal: number; tax: number; total: number; paymentMethod: "cash" | "card" | "instapay"; items: Array<{ productId: number; quantity: number; name: string; unitPrice: number; lineTotal: number }> }) {
  const db = await getDb();
  if (!db) return null;
  const receiptNumber = `GH-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Date.now()).slice(-4)}`;
  const result = await db.insert(sales).values({ receiptNumber, cashierId: input.cashierId, customerName: input.customerName ?? null, subtotal: input.subtotal.toFixed(2), tax: input.tax.toFixed(2), total: input.total.toFixed(2), paymentMethod: input.paymentMethod });
  const saleId = Number(result[0].insertId);
  await db.insert(saleItems).values(input.items.map((item) => ({ saleId, productId: item.productId, nameSnapshot: item.name, quantity: item.quantity, unitPrice: item.unitPrice.toFixed(2), lineTotal: item.lineTotal.toFixed(2) })));
  return { id: saleId, receiptNumber };
}

export async function createSkuPrintJob(requestedBy: number | null, rowCount: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(skuPrintJobs).values({ requestedBy, rowCount, status: "exported" });
  return { id: Number(result[0].insertId), rowCount };
}
