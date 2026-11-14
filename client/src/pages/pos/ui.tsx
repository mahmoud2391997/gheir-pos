import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatMoney, formatTime, printHtmlDocument, type PaymentMethod, paymentLabels } from "../../../../shared/sku";
import type { PosExtras } from "../../../../shared/pos";

export type T = (en: string, ar: string) => string;
export const makeTr = (isArabic: boolean): T => (en, ar) => (isArabic ? ar || en : en || ar);
export const useMoney = (isArabic: boolean) => (value: number) => formatMoney(value, isArabic ? "ar-EG" : "en-EG");
export const stamp = (value: string, isArabic: boolean) => `${formatDate(value, isArabic ? "ar" : "en")} ${formatTime(value, isArabic ? "ar" : "en")}`;
export const methodArabic: Record<PaymentMethod, string> = { cash: "نقداً", card: "بطاقة", instapay: "إنستاباي", wallet: "محفظة" };
export const methodLabel = (method: PaymentMethod, t: T) => t(paymentLabels[method], methodArabic[method]);

export type PosPageProps = { extras: PosExtras; onExtras: (next: PosExtras) => void; isArabic: boolean; userName: string; isAdmin: boolean };

export const inputCls = "h-10 w-full rounded-xl border border-[#cdbb9c] bg-[#f2ead8] px-3 text-sm outline-none ring-[#5c4033] focus:ring-2";
export const btnPrimary = "rounded-xl bg-[#2f3e34] px-4 py-2.5 text-sm font-bold text-[#f2ead8] transition hover:bg-[#3b4d40] disabled:cursor-not-allowed disabled:opacity-50";
export const btnSoft = "rounded-xl border border-[#cdbb9c] bg-[#eadfc9] px-4 py-2.5 text-sm font-bold text-[#2f3e34] transition hover:bg-[#dfd0b5] disabled:opacity-50";
export const btnDanger = "rounded-xl bg-[#9a5537] px-4 py-2.5 text-sm font-bold text-[#f2ead8] transition hover:bg-[#864a30] disabled:opacity-50";

export function Heading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mono text-[10px] uppercase tracking-[.2em] text-[#7f705e]">{eyebrow}</p><h1 className="serif mt-1 text-[38px] font-semibold leading-none tracking-tight text-[#2f3e34]">{title}</h1><p className="mt-2 text-sm text-[#71675b]">{detail}</p></div>{action}</div>;
}
export function Metric({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return <div className="rounded-2xl border border-[#cdbb9c] bg-[#f7f0e3] p-4"><span className="mono text-[9px] uppercase tracking-[.16em] text-[#817664]">{label}</span><div className={`mt-3 text-2xl font-extrabold tracking-tight ${warn ? "text-[#9a5537]" : "text-[#2f3e34]"}`}>{value}</div></div>;
}
export function Panel({ eyebrow, title, children, className = "" }: { eyebrow?: string; title: string; children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#cdbb9c] bg-[#f7f0e3] p-5 ${className}`}>{eyebrow && <p className="mono text-[9px] uppercase tracking-[.18em] text-[#817664]">{eyebrow}</p>}<h2 className="serif mt-1 mb-4 text-2xl font-semibold text-[#2f3e34]">{title}</h2>{children}</section>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-xs font-bold text-[#5c4033]"><span>{label}</span>{children}</label>;
}
export function ErrorLine({ message }: { message: string }) {
  return message ? <p role="alert" className="rounded-lg bg-[#f1d9cd] px-3 py-2 text-xs font-bold text-[#7a3b1f]">{message}</p> : null;
}
export function Empty({ text }: { text: string }) { return <p className="py-8 text-center text-sm text-[#817664]">{text}</p>; }
export function Modal({ open, onClose, title, description, children, wide = false }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return <Dialog open={open} onOpenChange={(next) => !next && onClose()}><DialogContent className={`max-h-[90dvh] overflow-y-auto border-[#cdbb9c] bg-[#f7f0e3] text-[#2f3e34] ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}><DialogHeader><DialogTitle className="serif text-2xl">{title}</DialogTitle>{description && <DialogDescription className="text-[#817664]">{description}</DialogDescription>}</DialogHeader>{children}</DialogContent></Dialog>;
}
export function Table({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  if (!rows.length) return <Empty text={empty} />;
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[#cdbb9c] text-start text-[10px] uppercase tracking-[.1em] text-[#817664]">{head.map((cell) => <th key={cell} className="px-2 py-2 text-start font-bold">{cell}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b border-[#e2d5bc] last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-2 py-2.5 align-top">{cell}</td>)}</tr>)}</tbody></table></div>;
}
export const esc = (value: string | number) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function printSheet(title: string, bodyHtml: string, isArabic: boolean) {
  printHtmlDocument(title, `<!DOCTYPE html><html lang="${isArabic ? "ar" : "en"}" dir="${isArabic ? "rtl" : "ltr"}"><head><title>${esc(title)}</title><style>@page{size:A4 portrait;margin:14mm}body{font-family:Arial,sans-serif;color:#2b2b2b;font-size:12px}h1{font-size:20px;margin:0 0 4px;color:#2f3e34}table{width:100%;border-collapse:collapse;margin:10px 0}td,th{padding:6px;border-bottom:1px solid #d9c7a3;text-align:start}.r{font-weight:bold}.m{color:#666}</style></head><body>${bodyHtml}</body></html>`);
}
