import { allMethods, findCustomers, pointsForTotal, redeemValue, type Customer, type LoyaltySettings } from "../../../../shared/pos";
import type { PaymentMethod } from "../../../../shared/sku";
import { makeTr, methodLabel, useMoney } from "./ui";
import { useState } from "react";

const field = "h-8 rounded-lg border border-[#526156] bg-[#26352c] px-2 text-sm text-[#f2ead8] outline-none focus:ring-2 focus:ring-[#d9c7a3]";
export type CheckoutState = { customerId: number | null; redeem: boolean; split: boolean; amounts: Partial<Record<PaymentMethod, string>>; newName: string; newPhone: string };
export const emptyCheckout: CheckoutState = { customerId: null, redeem: false, split: false, amounts: {}, newName: "", newPhone: "" };

export default function CheckoutExtras({ customers, loyalty, state, onChange, payable, isArabic, error, shiftOpen }: { customers: Customer[]; loyalty: LoyaltySettings; state: CheckoutState; onChange: (next: CheckoutState) => void; payable: number; isArabic: boolean; error: string; shiftOpen: boolean }) {
  const t = makeTr(isArabic); const money = useMoney(isArabic); const [query, setQuery] = useState("");
  const customer = customers.find((item) => item.id === state.customerId) ?? null;
  const matches = query.trim() ? findCustomers(customers, query).slice(0, 5) : [];
  const given = allMethods.reduce((sum, method) => sum + (Number(state.amounts[method]) || 0), 0);
  return <div className="mt-4 shrink-0 space-y-3 text-sm">
    {!shiftOpen && <p className="rounded-lg bg-[#4a3a2c] px-3 py-2 text-[11px] text-[#e9d9b8]">{t("No open shift — open one under Shift & cash to track the drawer.", "لا توجد وردية مفتوحة — افتح واحدة من الوردية والنقدية لتتبع الدرج.")}</p>}
    <div className="rounded-xl border border-[#526156] bg-[#26352c] p-3">
      <div className="flex items-center justify-between gap-2"><span className="mono text-[9px] uppercase tracking-[.14em] text-[#bfc8b9]">{t("Customer", "العميل")}</span>{customer && <button type="button" className="text-[10px] text-[#d9c7a3] underline" onClick={() => onChange({ ...state, customerId: null, redeem: false })}>{t("Clear", "إزالة")}</button>}</div>
      {customer ? <div className="mt-2"><p className="font-bold">{customer.name}</p><p className="text-[11px] text-[#bfc8b9]">{customer.points} {t("points", "نقطة")} ({money(redeemValue(customer.points, loyalty))}){loyalty.enabled && payable > 0 ? ` · +${pointsForTotal(payable, loyalty)} ${t("on this sale", "في هذا البيع")}` : ""}</p>
        {customer.points > 0 && loyalty.enabled && <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={state.redeem} onChange={(event) => onChange({ ...state, redeem: event.target.checked })} />{t("Redeem points against this sale", "استبدال النقاط في هذا البيع")}</label>}</div>
      : <div className="mt-2 space-y-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${field} w-full`} placeholder={t("Find existing customer (name or phone)…", "ابحث عن عميل (الاسم أو الهاتف)…")} aria-label={t("Search customers", "بحث العملاء")} />{matches.map((item) => <button key={item.id} type="button" onClick={() => { onChange({ ...state, customerId: item.id, newName: "", newPhone: "" }); setQuery(""); }} className="flex w-full justify-between rounded-lg bg-[#415045] px-2 py-1.5 text-start text-xs"><span>{item.name}</span><span className="text-[#bfc8b9]">{item.phone}</span></button>)}
        <div className="border-t border-[#526156] pt-2"><p className="mb-1.5 text-[10px] text-[#bfc8b9]">{t("Or enter the purchaser — saved to Customers when the sale completes.", "أو أدخل اسم المشتري — يُحفظ في العملاء عند إتمام البيع.")}</p><div className="grid grid-cols-2 gap-2"><input value={state.newName} onChange={(event) => onChange({ ...state, newName: event.target.value })} className={`${field} w-full`} placeholder={t("Purchaser name", "اسم المشتري")} aria-label={t("Purchaser name", "اسم المشتري")} /><input value={state.newPhone} inputMode="tel" onChange={(event) => onChange({ ...state, newPhone: event.target.value })} className={`${field} w-full`} placeholder={t("Phone (optional)", "الهاتف (اختياري)")} aria-label={t("Purchaser phone", "هاتف المشتري")} /></div></div></div>}
    </div>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={state.split} onChange={(event) => onChange({ ...state, split: event.target.checked })} />{t("Split payment across methods", "تقسيم الدفع على عدة طرق")}</label>
    {state.split && <div className="space-y-1.5 rounded-xl border border-[#526156] bg-[#26352c] p-3">{allMethods.map((method) => <div key={method} className="flex items-center justify-between gap-3"><span className="text-xs">{methodLabel(method, t)}</span><input type="number" inputMode="decimal" min="0" value={state.amounts[method] ?? ""} onChange={(event) => onChange({ ...state, amounts: { ...state.amounts, [method]: event.target.value } })} className={`${field} w-28 text-end`} placeholder="0" aria-label={methodLabel(method, t)} /></div>)}<div className="flex justify-between pt-1 text-xs text-[#bfc8b9]"><span>{t("Entered", "المُدخل")}: {money(given)}</span><span>{given >= payable ? `${t("Change", "الباقي")}: ${money(Math.max(0, given - payable))}` : `${t("Remaining", "المتبقي")}: ${money(payable - given)}`}</span></div></div>}
    {error && <p role="alert" className="rounded-lg bg-[#5a2f20] px-3 py-2 text-xs font-bold text-[#f6d9cc]">{error}</p>}
  </div>;
}
