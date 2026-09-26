import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  inventoryUnits,
  productVariants,
  products,
  saleItems,
  sales,
  skuPrintJobs,
  users,
} from "../drizzle/schema";
import {
  createProductSku,
  generateColorCode,
  generateFamilyCode,
} from "../shared/sku";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// The live database connection stays commented out until the website is ready to launch.
// The web app is a demo and reads its data from localStorage.
// The Electron desktop app saves that same data in a local file on the computer.
// The Drizzle schema remains in drizzle/schema.ts for the future connection.
export async function getDb(): Promise<ReturnType<typeof drizzle> | null> {
  // if (!_db && process.env.DATABASE_URL) {
  //   try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  // }
  // return _db;
  return null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  const updateSet: Record<string, unknown> = {
    name: values.name,
    email: values.email,
    loginMethod: values.loginMethod,
    lastSignedIn: values.lastSignedIn,
  };
  if (user.role) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return result[0];
}

export async function listProducts() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ product: products, variant: productVariants })
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .where(eq(products.active, 1));
  const grouped = new Map<
    number,
    {
      product: typeof products.$inferSelect;
      variants: Array<typeof productVariants.$inferSelect>;
    }
  >();
  for (const row of rows) {
    const current = grouped.get(row.product.id) ?? {
      product: row.product,
      variants: [],
    };
    if (row.variant) current.variants.push(row.variant);
    grouped.set(row.product.id, current);
  }
  const stockRows = await db
    .select({
      productId: inventoryUnits.productId,
      count: sql<number>`count(*)`,
    })
    .from(inventoryUnits)
    .where(eq(inventoryUnits.status, "available"))
    .groupBy(inventoryUnits.productId);
  const stockByProduct = new Map(
    stockRows.map(row => [row.productId, Number(row.count)])
  );
  return Array.from(grouped.values()).map(({ product, variants }) => ({
    ...product,
    price: Number(product.price),
    stock: stockByProduct.get(product.id) ?? 0,
    color: variants[0]?.color ?? "Natural",
    colorCode: variants[0]?.colorCode ?? "NAT",
    variants,
  }));
}

export async function getDashboard() {
  const db = await getDb();
  if (!db)
    return {
      todaySales: 0,
      completedSales: 0,
      averageOrder: 0,
      lowStockItems: 0,
    };
  const salesRows = await db
    .select({ total: sales.total })
    .from(sales)
    .where(eq(sales.status, "completed"));
  const available = await db
    .select({
      productId: inventoryUnits.productId,
      count: sql<number>`count(*)`,
    })
    .from(inventoryUnits)
    .where(eq(inventoryUnits.status, "available"))
    .groupBy(inventoryUnits.productId);
  const todaySales = salesRows.reduce((sum, row) => sum + Number(row.total), 0);
  return {
    todaySales,
    completedSales: salesRows.length,
    averageOrder: salesRows.length
      ? Math.round(todaySales / salesRows.length)
      : 0,
    lowStockItems: available.filter(row => Number(row.count) <= 3).length,
  };
}

export async function listSales(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(sales)
    .orderBy(desc(sales.createdAt))
    .limit(limit);
  const items = await db.select().from(saleItems);
  return rows.map(sale => ({
    ...sale,
    subtotal: Number(sale.subtotal),
    tax: Number(sale.tax),
    total: Number(sale.total),
    items: items
      .filter(item => item.saleId === sale.id)
      .map(item => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        total: Number(item.lineTotal),
      })),
  }));
}

export async function createProductWithVariant(input: {
  name: string;
  arabicName?: string;
  category: string;
  price: number;
  colors: string[];
  copies: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const baseSku = generateFamilyCode(input.name);
  const result = await db
    .insert(products)
    .values({
      name: input.name,
      arabicName: input.arabicName ?? null,
      category: input.category,
      baseSku,
      price: input.price.toFixed(2),
    });
  const productId = Number(result[0].insertId);
  const created = [];
  for (const color of input.colors) {
    const colorCode = generateColorCode(color);
    const variantResult = await db
      .insert(productVariants)
      .values({ productId, color, colorCode, nextSerial: input.copies + 1 });
    const variantId = Number(variantResult[0].insertId);
    const units = Array.from({ length: input.copies }, (_, index) => ({
      productId,
      variantId,
      sku: createProductSku(baseSku, colorCode, index + 1),
      serial: index + 1,
    }));
    if (units.length) await db.insert(inventoryUnits).values(units);
    created.push({ variantId, color, colorCode, count: units.length });
  }
  return {
    productId,
    baseSku,
    variants: created,
    count: created.reduce((total, variant) => total + variant.count, 0),
  };
}

export async function createSale(input: {
  cashierId: number;
  customerName?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "card" | "instapay";
  items: Array<{
    productId: number;
    quantity: number;
    name: string;
    unitPrice: number;
    lineTotal: number;
  }>;
}) {
  const db = await getDb();
  if (!db) return null;
  const receiptNumber = `GH-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Date.now()).slice(-4)}`;
  const result = await db
    .insert(sales)
    .values({
      receiptNumber,
      cashierId: input.cashierId,
      customerName: input.customerName ?? null,
      subtotal: input.subtotal.toFixed(2),
      tax: input.tax.toFixed(2),
      total: input.total.toFixed(2),
      paymentMethod: input.paymentMethod,
    });
  const saleId = Number(result[0].insertId);
  await db
    .insert(saleItems)
    .values(
      input.items.map(item => ({
        saleId,
        productId: item.productId,
        nameSnapshot: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        lineTotal: item.lineTotal.toFixed(2),
      }))
    );
  return { id: saleId, receiptNumber };
}

export async function createSkuPrintJob(
  requestedBy: number | null,
  rowCount: number
) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .insert(skuPrintJobs)
    .values({ requestedBy, rowCount, status: "exported" });
  return { id: Number(result[0].insertId), rowCount };
}

export type PosRemoteProduct = {
  name: string;
  slug: string;
  sku?: string;
  category: string;
  price: number;
  stock: number;
  status?: string;
  updatedAt?: string;
};

export async function getPosWatermark(): Promise<{
  asOf: string | null;
  version: string | null;
}> {
  const db = await getDb();
  if (!db) return { asOf: null, version: null };

  const [productMax] = await db
    .select({ updatedAt: sql<Date | null>`max(${products.updatedAt})` })
    .from(products);
  const [unitMax] = await db
    .select({ updatedAt: sql<Date | null>`max(${inventoryUnits.updatedAt})` })
    .from(inventoryUnits);
  const [saleMax] = await db
    .select({ createdAt: sql<Date | null>`max(${sales.createdAt})` })
    .from(sales);

  const dates = [
    productMax?.updatedAt ?? null,
    unitMax?.updatedAt ?? null,
    saleMax?.createdAt ?? null,
  ].filter((d): d is Date => d instanceof Date);
  const asOfDate = dates.length
    ? new Date(Math.max(...dates.map(d => d.getTime())))
    : null;
  const asOf = asOfDate ? asOfDate.toISOString() : null;
  return { asOf, version: asOf };
}

export async function listPosProducts(options?: {
  since?: string;
}): Promise<{
  products: PosRemoteProduct[];
  asOf: string | null;
  version: string | null;
}> {
  const db = await getDb();
  if (!db) return { products: [], asOf: null, version: null };

  const watermark = await getPosWatermark();

  const sinceDate =
    options?.since && Number.isFinite(Date.parse(options.since))
      ? new Date(options.since)
      : null;

  let productIds: number[] | null = null;
  if (sinceDate) {
    const changedProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.active, 1), sql`${products.updatedAt} > ${sinceDate}`));

    const changedUnits = await db
      .selectDistinct({ productId: inventoryUnits.productId })
      .from(inventoryUnits)
      .where(sql`${inventoryUnits.updatedAt} > ${sinceDate}`);

    const ids = new Set<number>();
    for (const row of changedProducts) ids.add(Number(row.id));
    for (const row of changedUnits) ids.add(Number(row.productId));
    productIds = Array.from(ids);
  }

  if (productIds && productIds.length === 0) {
    return { products: [], asOf: watermark.asOf, version: watermark.version };
  }

  const rows = await db
    .select()
    .from(products)
    .where(
      and(eq(products.active, 1), productIds ? inArray(products.id, productIds) : sql`true`)
    );
  const stockRows = await db
    .select({
      productId: inventoryUnits.productId,
      count: sql<number>`count(*)`,
    })
    .from(inventoryUnits)
    .where(
      and(
        eq(inventoryUnits.status, "available"),
        productIds ? inArray(inventoryUnits.productId, productIds) : sql`true`
      )
    )
    .groupBy(inventoryUnits.productId);
  const stockByProduct = new Map(
    stockRows.map(row => [row.productId, Number(row.count)])
  );

  const unitUpdatedRows = await db
    .select({
      productId: inventoryUnits.productId,
      updatedAt: sql<Date | null>`max(${inventoryUnits.updatedAt})`,
    })
    .from(inventoryUnits)
    .where(productIds ? inArray(inventoryUnits.productId, productIds) : sql`true`)
    .groupBy(inventoryUnits.productId);
  const unitUpdatedAtByProduct = new Map(
    unitUpdatedRows.map(row => [row.productId, row.updatedAt])
  );

  const result: PosRemoteProduct[] = rows.map(p => ({
    name: p.name,
    slug: p.baseSku,
    sku: p.baseSku,
    category: p.category,
    price: Number(p.price),
    stock: stockByProduct.get(p.id) ?? 0,
    status: p.active ? "published" : "draft",
    updatedAt: (() => {
      const a = p.updatedAt instanceof Date ? p.updatedAt : null;
      const b = unitUpdatedAtByProduct.get(p.id) ?? null;
      const ts = [a, b].filter((d): d is Date => d instanceof Date);
      if (!ts.length) return undefined;
      return new Date(Math.max(...ts.map(d => d.getTime()))).toISOString();
    })(),
  }));

  return { products: result, asOf: watermark.asOf, version: watermark.version };
}

export async function createPosSale(input: {
  receiptNumber: string;
  paymentMethod: "cash" | "card" | "instapay";
  items: Array<{ sku: string; quantity: number }>;
}): Promise<{ deduped: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select({ id: sales.id })
    .from(sales)
    .where(eq(sales.receiptNumber, input.receiptNumber))
    .limit(1);
  if (existing.length) return { deduped: true };

  const skus = Array.from(new Set(input.items.map(it => it.sku)));
  const productRows = await db
    .select()
    .from(products)
    .where(inArray(products.baseSku, skus));
  const bySku = new Map(productRows.map(p => [p.baseSku, p]));
  for (const sku of skus) {
    if (!bySku.has(sku)) throw new Error(`Unknown SKU: ${sku}`);
  }

  const now = new Date();
  const computedItems = input.items.map(it => {
    const p = bySku.get(it.sku)!;
    const unitPrice = Number(p.price);
    const lineTotal = unitPrice * it.quantity;
    return {
      productId: p.id,
      nameSnapshot: p.name,
      quantity: it.quantity,
      unitPrice,
      lineTotal,
    };
  });

  const subtotal = computedItems.reduce((sum, it) => sum + it.lineTotal, 0);
  const tax = 0;
  const total = subtotal + tax;

  const saleResult = await db.insert(sales).values({
    receiptNumber: input.receiptNumber,
    cashierId: null,
    customerName: null,
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
    paymentMethod: input.paymentMethod,
    status: "completed",
    createdAt: now,
  } as any);

  const saleId = Number((saleResult as any)[0]?.insertId ?? 0);

  await db.insert(saleItems).values(
    computedItems.map(it => ({
      saleId,
      productId: it.productId,
      inventoryUnitId: null,
      nameSnapshot: it.nameSnapshot,
      quantity: it.quantity,
      unitPrice: it.unitPrice.toFixed(2),
      lineTotal: it.lineTotal.toFixed(2),
    }))
  );

  for (const it of input.items) {
    const p = bySku.get(it.sku)!;
    const unitIds = await db
      .select({ id: inventoryUnits.id })
      .from(inventoryUnits)
      .where(
        and(
          eq(inventoryUnits.productId, p.id),
          eq(inventoryUnits.status, "available")
        )
      )
      .limit(it.quantity);

    if (unitIds.length < it.quantity) {
      throw new Error(`Insufficient stock for ${it.sku}`);
    }

    const ids = unitIds.map(row => row.id);
    await db
      .update(inventoryUnits)
      .set({ status: "sold", soldAt: now })
      .where(inArray(inventoryUnits.id, ids));
  }

  return { deduped: false };
}
