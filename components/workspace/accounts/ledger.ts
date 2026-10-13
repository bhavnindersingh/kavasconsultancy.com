import type { Currency } from "@/lib/workspace/types";
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
