import {
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    username: varchar("username", { length: 64 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    role: mysqlEnum("role", ["cashier", "admin"]).default("cashier").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => ({
    usernameUnique: uniqueIndex("users_username_unique").on(table.username),
  })
);

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    arabicName: varchar("arabicName", { length: 160 }),
    category: varchar("category", { length: 80 }).notNull(),
    baseSku: varchar("baseSku", { length: 32 }).notNull(),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    active: int("active").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ baseSkuIndex: index("products_baseSku_idx").on(table.baseSku) })
);

export const productVariants = mysqlTable(
  "product_variants",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull(),
    color: varchar("color", { length: 80 }).notNull(),
    colorCode: varchar("colorCode", { length: 16 }).notNull(),
    nextSerial: int("nextSerial").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    variantIndex: uniqueIndex("product_variants_product_color_idx").on(
      table.productId,
      table.colorCode
    ),
  })
);

export const inventoryUnits = mysqlTable(
  "inventory_units",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull(),
    variantId: int("variantId").notNull(),
    sku: varchar("sku", { length: 64 }).notNull().unique(),
    serial: int("serial").notNull(),
    status: mysqlEnum("status", ["available", "sold", "reserved", "damaged"])
      .default("available")
      .notNull(),
    soldAt: timestamp("soldAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    productStatusIndex: index("inventory_units_product_status_idx").on(
      table.productId,
      table.status
    ),
  })
);

export const sales = mysqlTable(
  "sales",
  {
    id: int("id").autoincrement().primaryKey(),
    receiptNumber: varchar("receiptNumber", { length: 40 }).notNull().unique(),
    cashierId: int("cashierId"),
    customerName: varchar("customerName", { length: 160 }),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    tax: decimal("tax", { precision: 12, scale: 2 }).notNull(),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: mysqlEnum("paymentMethod", [
      "cash",
      "card",
      "instapay",
    ]).notNull(),
    status: mysqlEnum("status", ["completed", "voided"])
      .default("completed")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    createdAtIndex: index("sales_createdAt_idx").on(table.createdAt),
  })
);

export const saleItems = mysqlTable("sale_items", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull(),
  productId: int("productId").notNull(),
  inventoryUnitId: int("inventoryUnitId"),
  nameSnapshot: varchar("nameSnapshot", { length: 160 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
});

export const skuPrintJobs = mysqlTable("sku_print_jobs", {
  id: int("id").autoincrement().primaryKey(),
  requestedBy: int("requestedBy"),
  format: varchar("format", { length: 32 }).default("csv").notNull(),
  rowCount: int("rowCount").notNull(),
  status: mysqlEnum("status", ["queued", "exported", "printed"])
    .default("queued")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type InventoryUnit = typeof inventoryUnits.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type SkuPrintJob = typeof skuPrintJobs.$inferSelect;
