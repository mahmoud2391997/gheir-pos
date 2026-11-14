import { useState } from "react";
import { adjustStock } from "../../../../shared/pos";
import type { ProductRecord } from "../../../../shared/sku";
import { ErrorLine, Field, Heading, Metric, Panel, Table, btnPrimary, inputCls, makeTr, stamp, type PosPageProps } from "./ui";

export default function StockPage({ extras, onExtras, isArabic, userName, products, onProducts }: PosPageProps & { products: ProductRecord[]; onProducts: (products: ProductRecord[]) => void }) {
  const t = makeTr(isArabic);
  const [form, setForm] = useState({ productId: "", counted: "", reason: "" }); const [error, setError] = useState(""); const [ok, setOk] = useState("");
  const [filter, setFilter] = useState("");
  const selected = products.find((p) => p.id === Number(form.productId));
  const reasons = [t("Stock count", "جرد"), t("Damaged", "تالف"), t("Lost / stolen", "مفقود / مسروق"), t("Found", "عُثر عليه"), t("Correction", "تصحيح")];
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = adjustStock(extras, products, Number(form.productId), Number(form.counted), form.reason, userName);
    if (!result.ok) { setError({ product: t("Choose a product.", "اختر منتجاً."), quantity: t("Enter a whole number, zero or more.", "أدخل عدداً صحيحاً صفر أو أكثر."), reason: t("Give a reason.", "اكتب السبب."), unchanged: t("The count matches current stock.", "العدد مطابق للمخزون الحالي.") }[result.error]); setOk(""); return; }
    onProducts(result.products); onExtras(result.extras); setForm({ productId: "", counted: "", reason: "" }); setError(""); setOk(t("Stock adjusted.", "تم تعديل المخزون.")); window.setTimeout(() => setOk(""), 2500);
  };
  const audit = extras.audit.filter((entry) => !filter || `${entry.action} ${entry.detail} ${entry.by}`.toLowerCase().includes(filter.toLowerCase()));
  const lowStock = products.filter((p) => p.stock <= 3);
  return <div className="display-in"><Heading eyebrow={t("GHEIR / Stock control", "GHEIR / مراقبة المخزون")} title={t("Stock control.", "مراقبة المخزون.")} detail={t("Reconcile counts, record losses, and review who did what.", "طابق الجرد وسجّل الفاقد وراجع من فعل ماذا.")} />
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><Metric label={t("Products", "المنتجات")} value={String(products.length)} /><Metric label={t("Low stock (≤3)", "مخزون منخفض (≤3)")} value={String(lowStock.length)} warn={lowStock.length > 0} /><Metric label={t("Adjustments logged", "التسويات المسجلة")} value={String(extras.adjustments.length)} /></div>
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Panel eyebrow={t("Adjust", "تسوية")} title={t("Stock adjustment", "تسوية مخزون")}><form onSubmit={submit} className="flex flex-col gap-3"><Field label={t("Product", "المنتج")}><select className={inputCls} value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value, counted: String(products.find((p) => p.id === Number(event.target.value))?.stock ?? "") })}><option value="">{t("Choose…", "اختر…")}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.color}</option>)}</select></Field>
      {selected && <p className="text-xs text-[#817664]">{t("System stock", "مخزون النظام")}: <b>{selected.stock}</b></p>}
      <Field label={t("Counted quantity", "الكمية المعدودة")}><input className={inputCls} type="number" min={0} step={1} value={form.counted} onChange={(event) => setForm({ ...form, counted: event.target.value })} /></Field>
      <Field label={t("Reason", "السبب")}><input className={inputCls} list="stock-reasons" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /><datalist id="stock-reasons">{reasons.map((r) => <option key={r} value={r} />)}</datalist></Field>
      <ErrorLine message={error} />{ok && <p role="status" className="rounded-lg bg-[#dbe6d4] px-3 py-2 text-xs font-bold text-[#2f3e34]">{ok}</p>}<button type="submit" className={btnPrimary}>{t("Apply adjustment", "تطبيق التسوية")}</button></form></Panel>
      <Panel eyebrow={t("History", "السجل")} title={t("Adjustments", "التسويات")}><Table head={[t("When", "الوقت"), t("Product", "المنتج"), t("Change", "التغيير"), t("Reason", "السبب"), t("By", "بواسطة")]} rows={extras.adjustments.slice(0, 40).map((a) => [stamp(a.createdAt, isArabic), a.name, `${a.before} → ${a.after} (${a.delta > 0 ? "+" : ""}${a.delta})`, a.reason, a.by])} empty={t("No adjustments yet.", "لا توجد تسويات بعد.")} /></Panel></div>
    <Panel className="mt-5" eyebrow={t("Accountability", "المساءلة")} title={t("Audit log", "سجل العمليات")}><input className={`${inputCls} mb-3 max-w-sm`} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t("Filter by action, person or detail…", "صفِّ بالإجراء أو الشخص أو التفاصيل…")} /><Table head={[t("When", "الوقت"), t("Who", "من"), t("Action", "الإجراء"), t("Detail", "التفاصيل")]} rows={audit.slice(0, 100).map((a) => [stamp(a.at, isArabic), a.by, <code key="c" className="text-xs">{a.action}</code>, a.detail])} empty={t("No activity recorded yet.", "لا يوجد نشاط مسجل بعد.")} /></Panel>
  </div>;
}
