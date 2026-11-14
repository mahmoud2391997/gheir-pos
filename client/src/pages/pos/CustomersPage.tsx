import { useMemo, useState } from "react";
import { addCustomer, customerStats, findCustomers, redeemValue, withAudit, type Customer } from "../../../../shared/pos";
import type { SaleRecord } from "../../../../shared/sku";
import { Empty, ErrorLine, Field, Heading, Metric, Modal, Panel, btnPrimary, btnSoft, inputCls, makeTr, stamp, useMoney, type PosPageProps } from "./ui";

export default function CustomersPage({ extras, onExtras, isArabic, userName, isAdmin, sales }: PosPageProps & { sales: SaleRecord[] }) {
  const t = makeTr(isArabic); const money = useMoney(isArabic);
  const [query, setQuery] = useState(""); const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" }); const [error, setError] = useState(""); const [openId, setOpenId] = useState<number | null>(null);
  const list = useMemo(() => findCustomers(extras.customers, query), [extras.customers, query]);
  const selected = extras.customers.find((customer) => customer.id === openId) ?? null;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = addCustomer(extras.customers, form);
    if ("error" in result) { setError(result.error === "name" ? t("Enter the customer's name.", "أدخل اسم العميل.") : t("A customer with this phone already exists.", "يوجد عميل بنفس رقم الهاتف.")); return; }
    onExtras(withAudit({ ...extras, customers: result.customers }, userName, "customer.add", result.customer.name));
    setForm({ name: "", phone: "", email: "", notes: "" }); setError("");
  };
  const adjustPoints = (customer: Customer, delta: number) => onExtras(withAudit({ ...extras, customers: extras.customers.map((item) => item.id === customer.id ? { ...item, points: Math.max(0, item.points + delta) } : item) }, userName, "customer.points", `${customer.name} ${delta > 0 ? "+" : ""}${delta}`));
  const removeCustomer = (customer: Customer) => { onExtras(withAudit({ ...extras, customers: extras.customers.filter((item) => item.id !== customer.id) }, userName, "customer.delete", customer.name)); setOpenId(null); };
  const stats = selected ? customerStats(selected, sales, extras.refunds) : null;
  return <div className="display-in"><Heading eyebrow={t("GHEIR / Customers", "GHEIR / العملاء")} title={t("Customers.", "العملاء.")} detail={t("Profiles, purchase history and loyalty points.", "الملفات وسجل المشتريات ونقاط الولاء.")} />
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><Metric label={t("Customers", "العملاء")} value={String(extras.customers.length)} /><Metric label={t("Points outstanding", "النقاط القائمة")} value={String(extras.customers.reduce((sum, customer) => sum + customer.points, 0))} /><Metric label={t("Loyalty value", "قيمة الولاء")} value={money(redeemValue(extras.customers.reduce((sum, customer) => sum + customer.points, 0), extras.loyalty))} /></div>
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <Panel eyebrow={t("Directory", "الدليل")} title={t("All customers", "كل العملاء")}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputCls} placeholder={t("Search name, phone or email…", "ابحث بالاسم أو الهاتف أو البريد…")} />
        <div className="mt-3 divide-y divide-[#e2d5bc]">{list.length ? list.map((customer) => <button key={customer.id} type="button" onClick={() => setOpenId(customer.id)} className="flex w-full items-center justify-between gap-3 py-3 text-start hover:bg-[#eadfc9]/60"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{customer.name}</p><p className="text-xs text-[#817664]">{customer.phone || t("No phone", "بدون هاتف")}</p></div><span className="mono text-xs font-bold text-[#5c4033]">{customer.points} {t("pts", "نقطة")}</span></button>) : <Empty text={extras.customers.length ? t("No customers match.", "لا يوجد عملاء مطابقون.") : t("No customers yet — add the first one.", "لا يوجد عملاء بعد — أضف أول عميل.")} />}</div>
      </Panel>
      <div className="flex flex-col gap-5">
        <Panel eyebrow={t("New", "جديد")} title={t("Add customer", "إضافة عميل")}>
          <form onSubmit={submit} className="flex flex-col gap-3"><Field label={t("Name", "الاسم")}><input className={inputCls} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label={t("Phone", "الهاتف")}><input className={inputCls} inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field><Field label={t("Email (optional)", "البريد (اختياري)")}><input className={inputCls} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field><Field label={t("Notes (optional)", "ملاحظات (اختياري)")}><input className={inputCls} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field><ErrorLine message={error} /><button type="submit" className={btnPrimary}>{t("Save customer", "حفظ العميل")}</button></form>
        </Panel>
      </div>
    </div>
    <Modal open={Boolean(selected)} onClose={() => setOpenId(null)} title={selected?.name ?? ""} description={selected ? [selected.phone, selected.email].filter(Boolean).join(" · ") : ""} wide>
      {selected && stats && <div className="flex flex-col gap-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label={t("Orders", "الطلبات")} value={String(stats.orders)} /><Metric label={t("Spent", "المنفق")} value={money(stats.spent)} /><Metric label={t("Average", "المتوسط")} value={money(stats.average)} /><Metric label={t("Points", "النقاط")} value={String(selected.points)} /></div>
        {selected.notes && <p className="rounded-xl bg-[#eadfc9] p-3 text-sm">{selected.notes}</p>}
        <p className="text-xs text-[#817664]">{stats.lastVisit ? `${t("Last visit", "آخر زيارة")}: ${stamp(stats.lastVisit, isArabic)}` : t("No purchases yet.", "لا مشتريات بعد.")}</p>
        <div className="max-h-48 divide-y divide-[#e2d5bc] overflow-y-auto">{stats.sales.map((sale) => <div key={sale.id} className="flex justify-between py-2 text-sm"><span>{sale.receiptNumber} · {stamp(sale.createdAt, isArabic)}</span><span className="font-bold">{money(sale.total)}</span></div>)}</div>
        {isAdmin && <div className="flex flex-wrap gap-2"><button type="button" className={btnSoft} onClick={() => adjustPoints(selected, 10)}>+10 {t("pts", "نقطة")}</button><button type="button" className={btnSoft} onClick={() => adjustPoints(selected, -10)}>−10 {t("pts", "نقطة")}</button><button type="button" className={btnSoft} onClick={() => removeCustomer(selected)}>{t("Delete customer", "حذف العميل")}</button></div>}
      </div>}
    </Modal>
  </div>;
}
