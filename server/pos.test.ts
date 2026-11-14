import { describe, expect, it } from "vitest";
import { addCashMovement, addCustomer, addExpense, addSupplier, adjustStock, applyRefundToProducts, applySaleToCustomer, closeShift, createRefund, currentShift, customerStats, emptyExtras, normalizeExtras, openShift, pointsForTotal, pointsToReverse, profitSummary, receivePurchase, refundStatus, refundableLines, resolveTenders, shiftSummary, type PosExtras, type RefundRecord } from "../shared/pos";
import { createLocalDatabase, defaultSystemSettings, parseLocalDatabase, type ProductRecord, type SaleRecord } from "../shared/sku";

const product = (id: number, stock: number, cost = 10): ProductRecord => ({ id, name: `P${id}`, category: "C", baseSku: `P${id}`, price: 100, cost, stock, color: "Clay", colorCode: "CLAY", shape: "round" });
const sale = (over: Partial<SaleRecord> = {}): SaleRecord => ({ id: 1, receiptNumber: "GH-1", total: 270, discount: 30, tax: 0, paymentMethod: "cash", items: [{ productId: 1, name: "P1", quantity: 2, total: 200, costTotal: 20 }, { productId: 2, name: "P2", quantity: 1, total: 100, costTotal: 10 }], createdAt: new Date().toISOString(), ...over });

describe("split payments", () => {
  it("accepts cash plus card and computes change on the cash part only", () => {
    const result = resolveTenders(270, [{ method: "card", amount: 100 }, { method: "cash", amount: 200 }]);
    expect(result).toMatchObject({ ok: true, primary: "cash", tendered: 200, change: 30 });
    if (result.ok) expect(result.payments).toEqual([{ method: "card", amount: 100 }, { method: "cash", amount: 170 }]);
  });
  it("rejects short payment, empty payment and over-paid non-cash", () => {
    expect(resolveTenders(100, [{ method: "cash", amount: 50 }])).toEqual({ ok: false, error: "short" });
    expect(resolveTenders(100, [])).toEqual({ ok: false, error: "empty" });
    expect(resolveTenders(100, [{ method: "card", amount: 150 }])).toEqual({ ok: false, error: "overpaid-noncash" });
  });
  it("allows a wallet payment of the exact total", () => {
    expect(resolveTenders(100, [{ method: "wallet", amount: 100 }])).toMatchObject({ ok: true, primary: "wallet", tendered: null });
  });
});

describe("refunds", () => {
  it("pro-rates the sale discount and refunds a full sale to exactly the sale total", () => {
    const original = sale();
    const result = createRefund(original, [], [{ index: 0, quantity: 2, restock: true }, { index: 1, quantity: 1, restock: true }], "cash", "Customer return", "Ziad");
    expect(result.ok && result.refund.amount).toBe(270);
    if (result.ok) expect(refundStatus(original, [result.refund])).toBe("full");
  });
  it("supports partial refunds that never exceed the paid amount", () => {
    const original = sale();
    const first = createRefund(original, [], [{ index: 0, quantity: 1, restock: true }], "cash", "Cracked", "Ziad");
    expect(first.ok && first.refund.amount).toBe(90);
    if (!first.ok) throw new Error("expected refund");
    expect(refundStatus(original, [first.refund])).toBe("partial");
    expect(refundableLines(original, [first.refund])[0].remaining).toBe(1);
    const second = createRefund(original, [first.refund], [{ index: 0, quantity: 1, restock: false }, { index: 1, quantity: 1, restock: true }], "card", "Rest", "Ziad");
    expect(second.ok && second.refund.amount).toBe(180);
    expect(createRefund(original, [first.refund, ...(second.ok ? [second.refund] : [])], [{ index: 0, quantity: 1, restock: true }], "cash", "x", "Z")).toEqual({ ok: false, error: "too-many" });
  });
  it("requires a reason and a selection", () => {
    expect(createRefund(sale(), [], [], "cash", "r", "Z")).toEqual({ ok: false, error: "nothing" });
    expect(createRefund(sale(), [], [{ index: 0, quantity: 1, restock: true }], "cash", " ", "Z")).toEqual({ ok: false, error: "reason" });
  });
  it("restocks only items marked for return and reverses loyalty points proportionally", () => {
    const original = sale({ pointsEarned: 10 });
    const result = createRefund(original, [], [{ index: 0, quantity: 2, restock: true }, { index: 1, quantity: 1, restock: false }], "cash", "r", "Z");
    if (!result.ok) throw new Error("expected refund");
    const stocked = applyRefundToProducts([product(1, 5), product(2, 5)], result.refund);
    expect(stocked.map((item) => item.stock)).toEqual([7, 5]);
    expect(pointsToReverse(original, result.refund, [])).toBe(10);
  });
});

describe("customers & loyalty", () => {
  it("adds customers, rejects duplicates and tracks points and spend net of refunds", () => {
    const added = addCustomer([], { name: " Lina ", phone: "0100 111" });
    if ("error" in added) throw new Error("expected customer");
    expect(addCustomer(added.customers, { name: "Other", phone: "0100111" })).toEqual({ error: "duplicate-phone" });
    expect(addCustomer([], { name: " ", phone: "1" })).toEqual({ error: "name" });
    const id = added.customer.id;
    expect(pointsForTotal(550, { enabled: true, spendPerPoint: 100, pointValue: 1 })).toBe(5);
    expect(applySaleToCustomer(added.customers, id, 5, 0)[0].points).toBe(5);
    const bought = sale({ customerId: id });
    const refund = { saleId: 1, amount: 70 } as RefundRecord;
    expect(customerStats(added.customer, [bought], [refund])).toMatchObject({ orders: 1, spent: 200 });
  });
});

describe("shifts and cash drawer", () => {
  const base: PosExtras = { ...emptyExtras };
  it("reconciles expected cash from opening float, cash sales, refunds, movements and drawer expenses", () => {
    const opened = openShift(base, 500, "Ziad"); if (!opened.ok) throw new Error("open");
    expect(openShift(opened.extras, 1, "Z")).toEqual({ ok: false, error: "already-open" });
    const sales = [sale({ payments: [{ method: "cash", amount: 170 }, { method: "card", amount: 100 }], total: 270 })];
    const moved = addCashMovement(opened.extras, "out", 50, "Bank drop", "Ziad"); if (!moved.ok) throw new Error("move");
    const spent = addExpense(moved.extras, { category: "Supplies", description: "Tape", amount: 20, method: "cash", fromDrawer: true }, "Ziad"); if (!spent.ok) throw new Error("expense");
    const refund = { id: 1, saleId: 1, receiptNumber: "GH-1", items: [], amount: 40, method: "cash", reason: "r", by: "Z", createdAt: opened.shift.openedAt } as RefundRecord;
    const withRefund = { ...spent.extras, refunds: [refund] };
    const live = shiftSummary(currentShift(withRefund.shifts)!, sales, withRefund.refunds, withRefund.expenses);
    expect(live.byMethod).toMatchObject({ cash: 170, card: 100 });
    expect(live.expectedCash).toBe(500 + 170 - 40 - 50 - 20);
    const closed = closeShift(withRefund, sales, 555, "ok", "Ziad"); if (!closed.ok) throw new Error("close");
    expect(closed.summary.variance).toBe(555 - 560);
    expect(currentShift(closed.extras.shifts)).toBeNull();
    expect(closed.extras.audit[0].action).toBe("shift.close");
  });
  it("blocks drawer movements and drawer expenses without an open shift", () => {
    expect(addCashMovement(base, "in", 10, "x", "Z")).toEqual({ ok: false, error: "no-shift" });
    expect(addExpense(base, { category: "Other", description: "x", amount: 5, method: "cash", fromDrawer: true }, "Z")).toEqual({ ok: false, error: "no-shift" });
  });
});

describe("purchasing, stock control and profit", () => {
  it("receives stock, averages cost and logs the action", () => {
    const supplied = addSupplier(emptyExtras, { name: "Clay Co" }, "Admin"); if (!supplied.ok) throw new Error("supplier");
    expect(addSupplier(supplied.extras, { name: "clay co" }, "Admin")).toEqual({ ok: false, error: "duplicate" });
    const received = receivePurchase(supplied.extras, [product(1, 10, 10)], { supplierId: 1, lines: [{ productId: 1, quantity: 10, unitCost: 20 }] }, "Admin");
    if (!received.ok) throw new Error("receive");
    expect(received.products[0]).toMatchObject({ stock: 20, cost: 15 });
    expect(received.purchase.total).toBe(200);
    expect(receivePurchase(emptyExtras, [product(1, 1)], { lines: [{ productId: 9, quantity: 1, unitCost: 1 }] }, "A")).toEqual({ ok: false, error: "invalid" });
  });
  it("adjusts stock with a mandatory reason and records before/after", () => {
    const result = adjustStock(emptyExtras, [product(1, 5)], 1, 3, "Damaged", "Admin"); if (!result.ok) throw new Error("adjust");
    expect(result.products[0].stock).toBe(3);
    expect(result.extras.adjustments[0]).toMatchObject({ before: 5, after: 3, delta: -2 });
    expect(adjustStock(emptyExtras, [product(1, 5)], 1, 3, "", "A")).toEqual({ ok: false, error: "reason" });
    expect(adjustStock(emptyExtras, [product(1, 5)], 1, 5, "same", "A")).toEqual({ ok: false, error: "unchanged" });
  });
  it("computes net profit after refunds, returned stock cost and expenses", () => {
    const original = sale();
    const result = createRefund(original, [], [{ index: 0, quantity: 1, restock: true }], "cash", "r", "Z"); if (!result.ok) throw new Error("refund");
    const spent = addExpense(emptyExtras, { category: "Rent", description: "May", amount: 50, method: "cash" }, "A"); if (!spent.ok) throw new Error("expense");
    expect(profitSummary([original], [result.refund], spent.extras.expenses)).toEqual({ revenue: 270, refunded: 90, netRevenue: 180, cogs: 20, grossProfit: 160, expenses: 50, netProfit: 110 });
  });
});

describe("persistence normalisation", () => {
  it("survives garbage and keeps valid records", () => {
    expect(normalizeExtras("nope")).toEqual(emptyExtras);
    const cleaned = normalizeExtras({ customers: [{ id: 1, name: "A", phone: "1", points: -4 }, { name: "" }, null], loyalty: { spendPerPoint: -1 } });
    expect(cleaned.customers).toHaveLength(1);
    expect(cleaned.customers[0].points).toBe(0);
    expect(cleaned.loyalty.spendPerPoint).toBe(100);
  });
});

describe("backup", () => {
  it("round-trips POS extras and split payments through export and import", () => {
    const supplied = addSupplier(emptyExtras, { name: "Clay Co" }, "Admin"); if (!supplied.ok) throw new Error("supplier");
    const split = sale({ payments: [{ method: "cash", amount: 170 }, { method: "wallet", amount: 100 }], customerId: 3 });
    const restored = parseLocalDatabase(JSON.stringify(createLocalDatabase({ products: [], sales: [split], settings: defaultSystemSettings, language: "en", extras: supplied.extras })));
    expect(restored?.sales[0].payments).toHaveLength(2);
    expect(normalizeExtras(restored?.extras).suppliers[0].name).toBe("Clay Co");
  });
});
