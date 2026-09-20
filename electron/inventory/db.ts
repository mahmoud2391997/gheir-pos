import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import Database from "better-sqlite3";
import type { PaymentMethod, ProductRecord } from "../../shared/sku";

export type PendingSaleRow = {
  clientSaleId: string;
  deviceId?: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number; name: string }>;
  status: "pending" | "synced" | "failed";
  attempts: number;
  lastError?: string | null;
  nextAttemptAt?: string | null;
};

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;
  const dir = app.getPath("userData");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "gheir-pos.sqlite");
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_sales (
      client_sale_id TEXT PRIMARY KEY,
      device_id TEXT,
      created_at TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT,
      items_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_attempt_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_products (
      id INTEGER PRIMARY KEY,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_sale_id TEXT,
      event TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_sales(status, next_attempt_at);
  `);
  return db;
}

export function writeCachedProducts(products: ProductRecord[]) {
  const database = getDb();
  const now = new Date().toISOString();
  const tx = database.transaction((rows: ProductRecord[]) => {
    database.prepare("DELETE FROM cached_products").run();
    const insert = database.prepare(
      "INSERT INTO cached_products (id, payload_json, updated_at) VALUES (@id, @payload_json, @updated_at)",
    );
    for (const product of rows) {
      insert.run({ id: product.id, payload_json: JSON.stringify(product), updated_at: now });
    }
  });
  tx(products);
}

export function readCachedProducts(): ProductRecord[] {
  const rows = getDb().prepare("SELECT payload_json FROM cached_products ORDER BY id").all() as Array<{ payload_json: string }>;
  return rows.map((row) => JSON.parse(row.payload_json) as ProductRecord);
}

export function enqueueSale(sale: Omit<PendingSaleRow, "status" | "attempts" | "lastError" | "nextAttemptAt">) {
  const database = getDb();
  const existing = database.prepare("SELECT client_sale_id, status FROM pending_sales WHERE client_sale_id = ?").get(sale.clientSaleId) as
    | { client_sale_id: string; status: string }
    | undefined;
  if (existing) return;
  database
    .prepare(
      `INSERT INTO pending_sales
      (client_sale_id, device_id, created_at, payment_method, notes, items_json, status, attempts, last_error, next_attempt_at, updated_at)
      VALUES (@client_sale_id, @device_id, @created_at, @payment_method, @notes, @items_json, 'pending', 0, NULL, NULL, @updated_at)`,
    )
    .run({
      client_sale_id: sale.clientSaleId,
      device_id: sale.deviceId ?? null,
      created_at: sale.createdAt,
      payment_method: sale.paymentMethod,
      notes: sale.notes ?? null,
      items_json: JSON.stringify(sale.items),
      updated_at: new Date().toISOString(),
    });
  appendSyncLog(sale.clientSaleId, "enqueued", "Sale queued for sync");
}

export function listPendingSales(): PendingSaleRow[] {
  const rows = getDb()
    .prepare("SELECT * FROM pending_sales WHERE status = 'pending' ORDER BY created_at ASC")
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapPendingRow);
}

export function countPendingSales() {
  const row = getDb().prepare("SELECT COUNT(*) AS c FROM pending_sales WHERE status = 'pending'").get() as { c: number };
  return Number(row.c) || 0;
}

export function markSaleSynced(clientSaleId: string, detail = "synced") {
  getDb()
    .prepare(
      `UPDATE pending_sales
       SET status = 'synced', last_error = NULL, next_attempt_at = NULL, updated_at = @updated_at
       WHERE client_sale_id = @client_sale_id`,
    )
    .run({ client_sale_id: clientSaleId, updated_at: new Date().toISOString() });
  appendSyncLog(clientSaleId, "synced", detail);
}

export function markSaleAttemptFailed(clientSaleId: string, error: string, nextAttemptAt: string, attempts: number) {
  getDb()
    .prepare(
      `UPDATE pending_sales
       SET attempts = @attempts, last_error = @last_error, next_attempt_at = @next_attempt_at, updated_at = @updated_at
       WHERE client_sale_id = @client_sale_id`,
    )
    .run({
      client_sale_id: clientSaleId,
      attempts,
      last_error: error.slice(0, 500),
      next_attempt_at: nextAttemptAt,
      updated_at: new Date().toISOString(),
    });
  appendSyncLog(clientSaleId, "retry_scheduled", error.slice(0, 500));
}

export function appendSyncLog(clientSaleId: string | null, event: string, detail?: string) {
  getDb()
    .prepare("INSERT INTO sync_log (client_sale_id, event, detail, created_at) VALUES (?, ?, ?, ?)")
    .run(clientSaleId, event, detail ?? null, new Date().toISOString());
}

function mapPendingRow(row: Record<string, unknown>): PendingSaleRow {
  return {
    clientSaleId: String(row.client_sale_id),
    deviceId: row.device_id ? String(row.device_id) : undefined,
    createdAt: String(row.created_at),
    paymentMethod: String(row.payment_method) as PaymentMethod,
    notes: row.notes ? String(row.notes) : undefined,
    items: JSON.parse(String(row.items_json)) as PendingSaleRow["items"],
    status: String(row.status) as PendingSaleRow["status"],
    attempts: Number(row.attempts) || 0,
    lastError: row.last_error ? String(row.last_error) : null,
    nextAttemptAt: row.next_attempt_at ? String(row.next_attempt_at) : null,
  };
}
