import { PAYER_ENTITY_LABEL, type AccountEntry, type Currency, type PayerEntity } from "@/lib/workspace/types";
import { today } from "../tasks/bits";

export type Period = "this_month" | "last_month" | "this_fy" | "last_fy" | "all" | "custom";

export function money(v: number, currency: Currency) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(v);
}

/** "YYYY-MM" of `iso` shifted by `offset` months. */
export function monthKey(iso: string, offset = 0) {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function lastDay(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

/** Inclusive date range for a preset. Financial years run April to March. */
export function periodRange(p: Period): { from: string; to: string } {
  const now = today();
  const [y, m] = now.split("-").map(Number);
  const fyStart = m >= 4 ? y : y - 1;
  switch (p) {
    case "this_month":
      return { from: `${monthKey(now)}-01`, to: lastDay(monthKey(now)) };
    case "last_month":
      return { from: `${monthKey(now, -1)}-01`, to: lastDay(monthKey(now, -1)) };
    case "this_fy":
      return { from: `${fyStart}-04-01`, to: `${fyStart + 1}-03-31` };
    case "last_fy":
      return { from: `${fyStart - 1}-04-01`, to: `${fyStart}-03-31` };
    default:
      return { from: "", to: "" };
  }
}

/** Split a GST-inclusive amount into taxable value and tax. */
export function splitGst(amount: number, rate: number) {
  const taxable = Math.round((amount / (1 + rate / 100)) * 100) / 100;
  return { taxable, gst: Math.round((amount - taxable) * 100) / 100 };
}

// ── Who paid ───────────────────────────────────────────────────────────────
// One string per payer for pickers and filters: a profile id, or
// "entity:<key>" for a firm.

const ENTITY = "entity:";

export function payerKey(e: Pick<AccountEntry, "paid_by_id" | "paid_by_entity">) {
  return e.paid_by_id ?? (e.paid_by_entity ? `${ENTITY}${e.paid_by_entity}` : "");
}

export const entityKey = (k: PayerEntity) => `${ENTITY}${k}`;

/** The two columns for a payer key ("" = not recorded). */
export function payerColumns(key: string): { paid_by_id: string | null; paid_by_entity: PayerEntity | null } {
  if (!key) return { paid_by_id: null, paid_by_entity: null };
  if (key.startsWith(ENTITY)) return { paid_by_id: null, paid_by_entity: key.slice(ENTITY.length) as PayerEntity };
  return { paid_by_id: key, paid_by_entity: null };
}

export function payerLabel(key: string, nameOf: (id: string | null) => string) {
  if (!key) return "Not recorded";
  if (key.startsWith(ENTITY)) return PAYER_ENTITY_LABEL[key.slice(ENTITY.length) as PayerEntity] ?? "A firm";
  return nameOf(key);
}
