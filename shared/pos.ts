import { rememberLocal, type PaymentMethod, type ProductRecord, type SaleRecord } from "./sku";

/* ---------- Types ---------- */
export type Customer = { id: number; name: string; phone: string; email?: string; notes?: string; points: number; createdAt: string };
export type Tender = { method: PaymentMethod; amount: number };
export type RefundItem = { index: number; productId?: number; name: string; arabicName?: string | null; quantity: number; amount: number; costTotal: number; restock: boolean };
export type RefundRecord = { id: number; saleId: number; receiptNumber: string; items: RefundItem[]; amount: number; method: PaymentMethod; reason: string; by: string; createdAt: string; pointsReversed?: number };
export type CashMovement = { id: number; type: "in" | "out"; amount: number; reason: string; by: string; createdAt: string };
export type Shift = { id: number; openedAt: string; openedBy: string; openingCash: number; closedAt?: string; closedBy?: string; countedCash?: number; note?: string; movements: CashMovement[] };
export type AuditEntry = { id: number; at: string; by: string; action: string; detail: string };
export type LoyaltySettings = { enabled: boolean; spendPerPoint: number; pointValue: number };
export type PosExtras = { customers: Customer[]; refunds: RefundRecord[]; shifts: Shift[]; audit: AuditEntry[]; loyalty: LoyaltySettings };

export const defaultLoyalty: LoyaltySettings = { enabled: true, spendPerPoint: 100, pointValue: 1 };
export const emptyExtras: PosExtras = { customers: [], refunds: [], shifts: [], audit: [], loyalty: defaultLoyalty };
export const posExtrasKey = "gheir-pos-extras";
/** Methods offered at the till. "card" is no longer accepted but stays valid on historical records. */
export const allMethods: PaymentMethod[] = ["cash", "instapay", "wallet"];
export const historicalMethods: PaymentMethod[] = [...allMethods, "card"];
/** Offered methods, plus legacy "card" only when old records actually used it. */
export const methodsInUse = (...totals: Array<Record<PaymentMethod, number>>): PaymentMethod[] => (totals.some((record) => record.card > 0) ? historicalMethods : allMethods);

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const num = (value: unknown, fallback = 0) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const nextId = (list: Array<{ id: number }>) => list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
const str = (value: unknown, fallback = "") => (typeof value === "string" ? value.trim() : fallback);
const iso = (value: unknown) => { const text = typeof value === "string" ? value : ""; return Number.isFinite(Date.parse(text)) ? text : new Date().toISOString(); };
const isMethod = (value: unknown): value is PaymentMethod => typeof value === "string" && (historicalMethods as string[]).includes(value);

/* ---------- Persistence ---------- */
export function normalizeExtras(raw: unknown): PosExtras {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = <T,>(value: unknown, map: (item: Record<string, unknown>) => T | null): T[] => (Array.isArray(value) ? value.map((item) => (item && typeof item === "object" ? map(item as Record<string, unknown>) : null)).filter((item): item is T => item != null) : []);
  return {
    customers: list(data.customers, (c) => (str(c.name) ? { id: num(c.id), name: str(c.name), phone: str(c.phone), email: str(c.email) || undefined, notes: str(c.notes) || undefined, points: Math.max(0, Math.floor(num(c.points))), createdAt: iso(c.createdAt) } : null)),
    refunds: list(data.refunds, (r) => (Array.isArray(r.items) ? ({ id: num(r.id), saleId: num(r.saleId), receiptNumber: str(r.receiptNumber), items: (r.items as RefundItem[]).map((i) => ({ index: num(i.index), productId: i.productId, name: str(i.name), arabicName: i.arabicName ?? null, quantity: num(i.quantity), amount: num(i.amount), costTotal: num(i.costTotal), restock: Boolean(i.restock) })), amount: num(r.amount), method: isMethod(r.method) ? r.method : "cash", reason: str(r.reason), by: str(r.by), createdAt: iso(r.createdAt), pointsReversed: num(r.pointsReversed) || undefined } as RefundRecord) : null)),
    shifts: list(data.shifts, (s) => ({ id: num(s.id), openedAt: iso(s.openedAt), openedBy: str(s.openedBy), openingCash: Math.max(0, num(s.openingCash)), closedAt: s.closedAt ? iso(s.closedAt) : undefined, closedBy: str(s.closedBy) || undefined, countedCash: s.countedCash == null ? undefined : num(s.countedCash), note: str(s.note) || undefined, movements: list(s.movements, (m) => ({ id: num(m.id), type: m.type === "out" ? "out" : "in", amount: Math.max(0, num(m.amount)), reason: str(m.reason), by: str(m.by), createdAt: iso(m.createdAt) } as CashMovement)) })),
    audit: list(data.audit, (a) => ({ id: num(a.id), at: iso(a.at), by: str(a.by), action: str(a.action), detail: str(a.detail) })),
    loyalty: defaultLoyalty,
  };
}
export function readPosExtras(): PosExtras {
  try { return normalizeExtras(JSON.parse(localStorage.getItem(posExtrasKey) || "null")); } catch { return normalizeExtras(null); }
}
export function persistPosExtras(extras: PosExtras) { rememberLocal(posExtrasKey, JSON.stringify(extras)); }

/* ---------- Audit ---------- */
export function withAudit(extras: PosExtras, by: string, action: string, detail: string): PosExtras {
  const entry: AuditEntry = { id: nextId(extras.audit), at: new Date().toISOString(), by, action, detail };
  return { ...extras, audit: [entry, ...extras.audit].slice(0, 1000) };
}

/* ---------- Split payments ---------- */
export type TenderResult = { ok: true; payments: Tender[]; primary: PaymentMethod; tendered: number | null; change: number | null } | { ok: false; error: "empty" | "short" | "overpaid-noncash" };
/** Resolve what the customer handed over into recorded payments. Cash may exceed the balance (change is given); other methods may not. */
export function resolveTenders(total: number, given: Tender[]): TenderResult {
  const clean = given.map((tender) => ({ method: tender.method, amount: round2(Math.max(0, num(tender.amount))) })).filter((tender) => tender.amount > 0);
  const due = round2(Math.max(0, total));
  if (due === 0) return { ok: true, payments: [{ method: "cash", amount: 0 }], primary: "cash", tendered: null, change: null };
  if (!clean.length) return { ok: false, error: "empty" };
  const nonCash = round2(clean.filter((tender) => tender.method !== "cash").reduce((sum, tender) => sum + tender.amount, 0));
  if (nonCash > due) return { ok: false, error: "overpaid-noncash" };
  const cashGiven = round2(clean.filter((tender) => tender.method === "cash").reduce((sum, tender) => sum + tender.amount, 0));
  const cashDue = round2(due - nonCash);
  if (cashGiven < cashDue) return { ok: false, error: "short" };
  const byMethod = new Map<PaymentMethod, number>();
  for (const tender of clean) if (tender.method !== "cash") byMethod.set(tender.method, round2((byMethod.get(tender.method) ?? 0) + tender.amount));
  if (cashDue > 0) byMethod.set("cash", cashDue);
  const payments = Array.from(byMethod, ([method, amount]) => ({ method, amount }));
  const primary = payments.reduce((best, tender) => (tender.amount > best.amount ? tender : best)).method;
  return { ok: true, payments, primary, tendered: cashGiven > 0 ? cashGiven : null, change: cashGiven > cashDue ? round2(cashGiven - cashDue) : cashGiven > 0 ? 0 : null };
}
/** Payments recorded on a sale; falls back to the single legacy method. */
export function salePayments(sale: SaleRecord): Tender[] { return sale.payments?.length ? sale.payments : [{ method: sale.paymentMethod, amount: sale.total }]; }

/* ---------- Loyalty ---------- */
export function pointsForTotal(total: number, loyalty: LoyaltySettings) { return loyalty.enabled ? Math.floor(Math.max(0, total) / loyalty.spendPerPoint) : 0; }
export function redeemValue(points: number, loyalty: LoyaltySettings) { return round2(Math.max(0, Math.floor(points)) * loyalty.pointValue); }
export function pointsNeededFor(amount: number, loyalty: LoyaltySettings) { return Math.ceil(Math.max(0, amount) / loyalty.pointValue); }
/** Apply a completed sale to a customer's balance and return the updated customer list. */
export function applySaleToCustomer(customers: Customer[], customerId: number | null | undefined, earned: number, redeemed: number): Customer[] {
  if (customerId == null) return customers;
  return customers.map((customer) => (customer.id === customerId ? { ...customer, points: Math.max(0, customer.points + earned - redeemed) } : customer));
}
export function customerStats(customer: Customer, sales: SaleRecord[], refunds: RefundRecord[]) {
  const own = sales.filter((sale) => sale.customerId === customer.id);
  const refunded = refunds.filter((refund) => own.some((sale) => sale.id === refund.saleId)).reduce((sum, refund) => sum + refund.amount, 0);
  const spent = round2(own.reduce((sum, sale) => sum + sale.total, 0) - refunded);
  return { orders: own.length, spent, average: own.length ? round2(spent / own.length) : 0, lastVisit: own.map((sale) => sale.createdAt).sort().at(-1) ?? null, sales: own };
}
export function findCustomers(customers: Customer[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return customers;
  return customers.filter((customer) => customer.name.toLowerCase().includes(needle) || customer.phone.replace(/\s/g, "").includes(needle.replace(/\s/g, "")) || (customer.email ?? "").toLowerCase().includes(needle));
}
export function addCustomer(customers: Customer[], input: { name: string; phone: string; email?: string; notes?: string }): { customers: Customer[]; customer: Customer } | { error: "name" | "duplicate-phone" } {
  const name = input.name.trim(); const phone = input.phone.trim();
  if (!name) return { error: "name" };
  if (phone && customers.some((customer) => customer.phone.replace(/\s/g, "") === phone.replace(/\s/g, ""))) return { error: "duplicate-phone" };
  const customer: Customer = { id: nextId(customers), name, phone, email: input.email?.trim() || undefined, notes: input.notes?.trim() || undefined, points: 0, createdAt: new Date().toISOString() };
  return { customers: [...customers, customer], customer };
}

/* ---------- Refunds ---------- */
/** Fraction of each line's sticker price that was actually paid after sale-level discount and tax. */
export function saleNetFactor(sale: SaleRecord) {
  const subtotal = sale.items.reduce((sum, item) => sum + item.total, 0);
  return subtotal > 0 ? sale.total / subtotal : 1;
}
export function refundedQuantities(sale: SaleRecord, refunds: RefundRecord[]) {
  const quantities = sale.items.map(() => 0);
  for (const refund of refunds) if (refund.saleId === sale.id) for (const item of refund.items) if (item.index in quantities) quantities[item.index] += item.quantity;
  return quantities;
}
export function refundedAmount(sale: SaleRecord, refunds: RefundRecord[]) { return round2(refunds.filter((refund) => refund.saleId === sale.id).reduce((sum, refund) => sum + refund.amount, 0)); }
export function refundableLines(sale: SaleRecord, refunds: RefundRecord[]) {
  const done = refundedQuantities(sale, refunds); const factor = saleNetFactor(sale);
  return sale.items.map((item, index) => { const remaining = Math.max(0, item.quantity - done[index]); const unit = item.quantity > 0 ? (item.total / item.quantity) * factor : 0; return { index, item, remaining, unitRefund: round2(unit) }; });
}
export type RefundSelection = { index: number; quantity: number; restock: boolean };
export function createRefund(sale: SaleRecord, prior: RefundRecord[], selections: RefundSelection[], method: PaymentMethod, reason: string, by: string): { ok: true; refund: RefundRecord } | { ok: false; error: "nothing" | "too-many" | "reason" } {
  const lines = refundableLines(sale, prior);
  const chosen = selections.filter((selection) => selection.quantity > 0);
  if (!chosen.length) return { ok: false, error: "nothing" };
  if (!reason.trim()) return { ok: false, error: "reason" };
  const items: RefundItem[] = [];
  for (const selection of chosen) {
    const line = lines[selection.index];
    if (!line || !Number.isInteger(selection.quantity) || selection.quantity > line.remaining) return { ok: false, error: "too-many" };
    const finalUnits = selection.quantity === line.remaining;
    const priorAmount = prior.filter((refund) => refund.saleId === sale.id).flatMap((refund) => refund.items).filter((item) => item.index === selection.index).reduce((sum, item) => sum + item.amount, 0);
    const lineNet = round2(line.item.total * saleNetFactor(sale));
    const amount = finalUnits ? round2(lineNet - priorAmount) : round2(line.unitRefund * selection.quantity);
    const unitCost = line.item.quantity > 0 ? (line.item.costTotal ?? 0) / line.item.quantity : 0;
    items.push({ index: selection.index, productId: line.item.productId, name: line.item.name, arabicName: line.item.arabicName ?? null, quantity: selection.quantity, amount: Math.max(0, amount), costTotal: round2(unitCost * selection.quantity), restock: selection.restock && line.item.productId != null && line.item.productId > 0 });
  }
  const amount = round2(items.reduce((sum, item) => sum + item.amount, 0));
  const refund: RefundRecord = { id: Date.now() + Math.floor(Math.random() * 1000), saleId: sale.id, receiptNumber: sale.receiptNumber, items, amount, method, reason: reason.trim(), by, createdAt: new Date().toISOString() };
  return { ok: true, refund };
}
export function applyRefundToProducts(products: ProductRecord[], refund: RefundRecord): ProductRecord[] {
  const back = new Map<number, number>();
  for (const item of refund.items) if (item.restock && item.productId != null) back.set(item.productId, (back.get(item.productId) ?? 0) + item.quantity);
  return products.map((product) => (back.has(product.id) ? { ...product, stock: product.stock + (back.get(product.id) ?? 0) } : product));
}
/** Loyalty points the refund takes back, proportional to the amount refunded, never more than the sale earned. */
export function pointsToReverse(sale: SaleRecord, refund: RefundRecord, prior: RefundRecord[]) {
  const earned = sale.pointsEarned ?? 0; if (!earned || sale.total <= 0) return 0;
  const already = prior.filter((item) => item.saleId === sale.id).reduce((sum, item) => sum + (item.pointsReversed ?? 0), 0);
  return Math.max(0, Math.min(earned - already, Math.round((refund.amount / sale.total) * earned)));
}
export function netSaleTotal(sale: SaleRecord, refunds: RefundRecord[]) { return round2(sale.total - refundedAmount(sale, refunds)); }
export function refundStatus(sale: SaleRecord, refunds: RefundRecord[]): "none" | "partial" | "full" {
  const amount = refundedAmount(sale, refunds); if (amount <= 0) return "none";
  return refundableLines(sale, refunds).every((line) => line.remaining === 0) ? "full" : "partial";
}

/* ---------- Shifts & cash drawer ---------- */
export function currentShift(shifts: Shift[]) { return shifts.find((shift) => !shift.closedAt) ?? null; }
export function openShift(extras: PosExtras, openingCash: number, by: string): { ok: true; extras: PosExtras; shift: Shift } | { ok: false; error: "already-open" | "negative" } {
  if (currentShift(extras.shifts)) return { ok: false, error: "already-open" };
  if (!(openingCash >= 0)) return { ok: false, error: "negative" };
  const shift: Shift = { id: nextId(extras.shifts), openedAt: new Date().toISOString(), openedBy: by, openingCash: round2(openingCash), movements: [] };
  return { ok: true, shift, extras: withAudit({ ...extras, shifts: [shift, ...extras.shifts] }, by, "shift.open", `#${shift.id} opening cash ${shift.openingCash}`) };
}
export function addCashMovement(extras: PosExtras, type: "in" | "out", amount: number, reason: string, by: string): { ok: true; extras: PosExtras } | { ok: false; error: "no-shift" | "amount" | "reason" } {
  const shift = currentShift(extras.shifts);
  if (!shift) return { ok: false, error: "no-shift" };
  if (!(amount > 0)) return { ok: false, error: "amount" };
  if (!reason.trim()) return { ok: false, error: "reason" };
  const movement: CashMovement = { id: nextId(shift.movements), type, amount: round2(amount), reason: reason.trim(), by, createdAt: new Date().toISOString() };
  const shifts = extras.shifts.map((item) => (item.id === shift.id ? { ...item, movements: [movement, ...item.movements] } : item));
  return { ok: true, extras: withAudit({ ...extras, shifts }, by, `cash.${type}`, `${movement.amount} — ${movement.reason}`) };
}
export type ShiftSummary = { sales: number; orders: number; gross: number; discounts: number; tax: number; refunds: number; net: number; byMethod: Record<PaymentMethod, number>; refundsByMethod: Record<PaymentMethod, number>; cashIn: number; cashOut: number; expectedCash: number; variance: number | null; startedAt: string; endedAt: string };
const zeroMethods = (): Record<PaymentMethod, number> => ({ cash: 0, card: 0, instapay: 0, wallet: 0 });
export function shiftSummary(shift: Shift, sales: SaleRecord[], refunds: RefundRecord[]): ShiftSummary {
  const start = Date.parse(shift.openedAt); const end = shift.closedAt ? Date.parse(shift.closedAt) : Date.now() + 1000;
  const inRange = (value: string) => { const at = Date.parse(value); return at >= start && at <= end; };
  const shiftSales = sales.filter((sale) => inRange(sale.createdAt));
  const shiftRefunds = refunds.filter((refund) => inRange(refund.createdAt));
  const byMethod = zeroMethods(); const refundsByMethod = zeroMethods();
  for (const sale of shiftSales) for (const payment of salePayments(sale)) byMethod[payment.method] = round2(byMethod[payment.method] + payment.amount);
  for (const refund of shiftRefunds) refundsByMethod[refund.method] = round2(refundsByMethod[refund.method] + refund.amount);
  const gross = round2(shiftSales.reduce((sum, sale) => sum + sale.total, 0)); const refundTotal = round2(shiftRefunds.reduce((sum, refund) => sum + refund.amount, 0));
  const cashIn = round2(shift.movements.filter((move) => move.type === "in").reduce((sum, move) => sum + move.amount, 0));
  const cashOut = round2(shift.movements.filter((move) => move.type === "out").reduce((sum, move) => sum + move.amount, 0));
  const expectedCash = round2(shift.openingCash + byMethod.cash - refundsByMethod.cash + cashIn - cashOut);
  return { sales: shiftSales.length, orders: shiftSales.length, gross, discounts: round2(shiftSales.reduce((sum, sale) => sum + sale.discount, 0)), tax: round2(shiftSales.reduce((sum, sale) => sum + sale.tax, 0)), refunds: refundTotal, net: round2(gross - refundTotal), byMethod, refundsByMethod, cashIn, cashOut, expectedCash, variance: shift.countedCash == null ? null : round2(shift.countedCash - expectedCash), startedAt: shift.openedAt, endedAt: shift.closedAt ?? new Date().toISOString() };
}
export function closeShift(extras: PosExtras, sales: SaleRecord[], countedCash: number, note: string, by: string): { ok: true; extras: PosExtras; summary: ShiftSummary } | { ok: false; error: "no-shift" | "negative" } {
  const shift = currentShift(extras.shifts);
  if (!shift) return { ok: false, error: "no-shift" };
  if (!(countedCash >= 0)) return { ok: false, error: "negative" };
  const closed: Shift = { ...shift, closedAt: new Date().toISOString(), closedBy: by, countedCash: round2(countedCash), note: note.trim() || undefined };
  const summary = shiftSummary(closed, sales, extras.refunds);
  const next = { ...extras, shifts: extras.shifts.map((item) => (item.id === shift.id ? closed : item)) };
  return { ok: true, summary, extras: withAudit(next, by, "shift.close", `#${shift.id} expected ${summary.expectedCash} counted ${closed.countedCash} variance ${summary.variance}`) };
}

/* ---------- Profit with refunds ---------- */
export function profitSummary(sales: SaleRecord[], refunds: RefundRecord[]) {
  const revenue = round2(sales.reduce((sum, sale) => sum + sale.total, 0));
  const refunded = round2(refunds.reduce((sum, refund) => sum + refund.amount, 0));
  const soldCost = sales.reduce((sum, sale) => sum + sale.items.reduce((inner, item) => inner + (item.costTotal ?? 0), 0), 0);
  const returnedCost = refunds.reduce((sum, refund) => sum + refund.items.filter((item) => item.restock).reduce((inner, item) => inner + item.costTotal, 0), 0);
  const cogs = round2(soldCost - returnedCost); const netRevenue = round2(revenue - refunded); const grossProfit = round2(netRevenue - cogs);
  return { revenue, refunded, netRevenue, cogs, grossProfit };
}
