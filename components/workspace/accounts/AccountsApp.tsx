"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import {
  ACCOUNT_CATEGORIES,
  CATEGORY_LABEL,
  type AccountCategory,
  type AccountEntry,
  type Currency,
} from "@/lib/workspace/types";
import { useWorkspace } from "../WorkspaceContext";
import { formatDate, today } from "../tasks/bits";
import EntryDialog from "./EntryDialog";
import SalaryDialog from "./SalaryDialog";
import { JOINT, money, monthKey, monthLabel, periodRange, type Period } from "./ledger";

const TREND_MONTHS = 6;

export default function AccountsApp() {
  const { people, nameOf } = useWorkspace();
  const supabase = supabaseBrowser();
  const partners = useMemo(() => people.filter((p) => p.role === "partner"), [people]);

  const [period, setPeriod] = useState<Period>("this_month");
  const [from, setFrom] = useState(() => periodRange("this_month").from);
  const [to, setTo] = useState(() => periodRange("this_month").to);
  const [category, setCategory] = useState<AccountCategory | "">("");
  const [owner, setOwner] = useState<string>("");
  const [search, setSearch] = useState("");
  const [gstOnly, setGstOnly] = useState(false);

  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [trend, setTrend] = useState<Pick<AccountEntry, "entry_date" | "category" | "currency" | "amount" | "owner_id">[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AccountEntry | "new" | null>(null);
  const [paying, setPaying] = useState(false);
  const [sort, setSort] = useState<{ key: "date" | "amount"; dir: 1 | -1 }>({ key: "date", dir: -1 });

  function choosePeriod(p: Period) {
    setPeriod(p);
    if (p !== "custom") {
      const r = periodRange(p);
      setFrom(r.from);
      setTo(r.to);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("account_entries").select("*, account_files(*)").order("entry_date", { ascending: false }).order("created_at", { ascending: false });
    if (from) q = q.gte("entry_date", from);
    if (to) q = q.lte("entry_date", to);
    const trendFrom = monthKey(today(), -(TREND_MONTHS - 1)) + "-01";
    const [list, tr] = await Promise.all([
      q,
      supabase.from("account_entries").select("entry_date, category, currency, amount, owner_id").gte("entry_date", trendFrom),
    ]);
    setLoading(false);
    if (list.error || tr.error) return setError((list.error ?? tr.error)!.message);
    setEntries((list.data ?? []) as AccountEntry[]);
    setTrend((tr.data ?? []) as typeof trend);
  }, [supabase, from, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when the period changes
    load();
  }, [load]);

  // Search and GST narrow everything; category/owner narrow only the table,
  // so the summary always shows every bucket for the period.
  const inPeriod = useMemo(() => {
    const s = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (gstOnly && !e.gst_applicable) return false;
      if (!s) return true;
      return [e.description, e.party, e.notes, e.reference_no, e.bank_narration, e.payee_account, e.invoice_no, e.vendor_gstin, e.paid_from]
        .some((v) => v?.toLowerCase().includes(s));
    });
  }, [entries, search, gstOnly]);

  const rows = useMemo(() => {
    const kept = inPeriod.filter(
      (e) => (!category || e.category === category) && (!owner || (owner === JOINT ? !e.owner_id : e.owner_id === owner)),
    );
    // The query returns newest first; only re-sort when asked to.
    if (sort.key === "date") return sort.dir === -1 ? kept : [...kept].reverse();
    return [...kept].sort((a, b) => (Number(a.amount) - Number(b.amount)) * sort.dir);
  }, [inPeriod, category, owner, sort]);

  const filtered = !!(category || owner || search.trim() || gstOnly);
  function clearFilters() {
    setCategory("");
    setOwner("");
    setSearch("");
    setGstOnly(false);
  }

  /** Sum by currency, as "₹1,200 + $40". */
  const sumOf = (list: AccountEntry[]) =>
    (["INR", "USD"] as Currency[])
      .map((cur) => ({ cur, v: list.filter((e) => e.currency === cur).reduce((a, e) => a + Number(e.amount), 0) }))
      .filter((x) => x.v > 0)
      .map((x) => money(x.v, x.cur))
      .join(" + ") || "—";

  // Month subheads with subtotals once the table spans more than one month
  // (and is in date order, where they make sense).
  const months = useMemo(() => {
    if (sort.key !== "date") return null;
    const keys = [...new Set(rows.map((e) => e.entry_date.slice(0, 7)))];
    return keys.length > 1 ? new Map(keys.map((k) => [k, rows.filter((e) => e.entry_date.startsWith(k))])) : null;
  }, [rows, sort.key]);

  const totals = useMemo(() => {
    const out = new Map<string, number>();
    for (const e of inPeriod) {
      const k = `${e.category}|${e.currency}`;
      out.set(k, (out.get(k) ?? 0) + Number(e.amount));
    }
    return out;
  }, [inPeriod]);

  const perPerson = useMemo(
    () =>
      people.map((p) => {
        const mine = inPeriod.filter((e) => e.owner_id === p.id);
        const sum = (c: AccountCategory) =>
          (["INR", "USD"] as Currency[])
            .map((cur) => ({ cur, v: mine.filter((e) => e.category === c && e.currency === cur).reduce((a, e) => a + Number(e.amount), 0) }))
            .filter((x) => x.v > 0);
        return { p, salary: sum("salary"), personal: sum("personal") };
      }),
    [people, inPeriod],
  );

  const trendRows = useMemo(() => {
    const months = Array.from({ length: TREND_MONTHS }, (_, i) => monthKey(today(), i - (TREND_MONTHS - 1)));
    return months.map((m) => {
      const ofMonth = trend.filter((e) => e.entry_date.startsWith(m) && (!owner || (owner === JOINT ? !e.owner_id : e.owner_id === owner)));
      return {
        month: m,
        cells: ACCOUNT_CATEGORIES.map((c) => {
          const inr = ofMonth.filter((e) => e.category === c && e.currency === "INR").reduce((a, e) => a + Number(e.amount), 0);
          const usd = ofMonth.filter((e) => e.category === c && e.currency === "USD").reduce((a, e) => a + Number(e.amount), 0);
          return { inr, usd };
        }),
      };
    });
  }, [trend, owner]);

  function exportCsv() {
    const head = [
      "Date", "Category", "Owner", "Salary month", "Party", "Description", "Amount", "Currency", "Payment method",
      "Paid from", "Reference", "Payee account", "Bank narration", "GST", "Vendor GSTIN", "Invoice no", "Invoice date",
      "GST rate", "Taxable value", "GST amount", "Notes", "Receipts",
    ];
    const cell = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((e) =>
      [
        e.entry_date, CATEGORY_LABEL[e.category], e.owner_id ? nameOf(e.owner_id) : "Joint", e.salary_month?.slice(0, 7), e.party,
        e.description, e.amount, e.currency, e.payment_method, e.paid_from, e.reference_no, e.payee_account, e.bank_narration,
        e.gst_applicable ? "Yes" : "No", e.vendor_gstin, e.invoice_no, e.invoice_date, e.gst_rate, e.taxable_value, e.gst_amount,
        e.notes, e.account_files?.length ?? 0,
      ].map(cell).join(","),
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kavas-accounts-${from || "start"}-to-${to || today()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl">Accounts</h1>
          <p className="text-sm text-mute mt-1">Salaries, purchases, personal and company spending.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="ws-btn" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
          {people.length > 0 && <button className="ws-btn" onClick={() => setPaying(true)}>Pay salaries</button>}
          <button className="ws-btn ws-btn--primary" onClick={() => setEditing("new")}>New entry</button>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-[#fef3f2] text-[#b42318] px-3 py-2 text-sm" role="alert">
          {error} <button className="underline ml-2" onClick={() => setError(null)}>Dismiss</button>
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2 mb-5">
        <select className="ws-input !w-auto" value={period} onChange={(e) => choosePeriod(e.target.value as Period)} aria-label="Period">
          <option value="this_month">This month</option>
          <option value="last_month">Last month</option>
          <option value="this_fy">This financial year</option>
          <option value="last_fy">Last financial year</option>
          <option value="all">All time</option>
          <option value="custom">Custom dates</option>
        </select>
        {period === "custom" && (
          <>
            <input type="date" className="ws-input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
            <input type="date" className="ws-input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
          </>
        )}
        <select className="ws-input !w-auto" value={category} onChange={(e) => setCategory(e.target.value as AccountCategory | "")} aria-label="Category">
          <option value="">All categories</option>
          {ACCOUNT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <select className="ws-input !w-auto" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner">
          <option value="">Everyone</option>
          <option value={JOINT}>Joint</option>
          {/* Anyone can be paid a salary, so anyone can be filtered to. */}
          {people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
        </select>
        <input className="ws-input !w-auto min-w-56 flex-1 max-w-sm" type="search" aria-label="Search entries" placeholder="Search party, reference, invoice…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm px-2 py-2">
          <input type="checkbox" checked={gstOnly} onChange={(e) => setGstOnly(e.target.checked)} /> GST only
        </label>
        {filtered && (
          <button className="text-sm text-mute underline underline-offset-2 px-1 py-2 hover:text-ink" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {ACCOUNT_CATEGORIES.map((c) => {
          const inr = totals.get(`${c}|INR`) ?? 0;
          const usd = totals.get(`${c}|USD`) ?? 0;
          return (
            <button
              key={c}
              onClick={() => setCategory((cur) => (cur === c ? "" : c))}
              className={`rounded-2xl border p-4 text-left transition-colors ${category === c ? "border-ink bg-card" : "border-line bg-card hover:border-ghost"}`}
            >
              <span className="block text-sm text-mute">{CATEGORY_LABEL[c]}</span>
              <span className="block font-serif text-2xl mt-1 tabular-nums">{money(inr, "INR")}</span>
              {usd > 0 && <span className="block text-sm tabular-nums">{money(usd, "USD")}</span>}
            </button>
          );
        })}
      </div>

      <p className="mb-4 px-1 text-sm">
        <span className="text-mute">Total for the period: </span>
        <span className="font-medium tabular-nums">{sumOf(inPeriod)}</span>
        <span className="text-mute"> · {inPeriod.length} entr{inPeriod.length === 1 ? "y" : "ies"}</span>
      </p>

      {perPerson.some((x) => x.salary.length || x.personal.length) && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-6 px-1">
          {perPerson.filter((x) => x.salary.length || x.personal.length).map(({ p, salary, personal }) => (
            <div key={p.id}>
              <span className="font-medium">{p.full_name || p.email}</span>
              <span className="text-mute"> · salary </span>
              {salary.length ? salary.map((s) => money(s.v, s.cur)).join(" + ") : "—"}
              <span className="text-mute"> · personal </span>
              {personal.length ? personal.map((s) => money(s.v, s.cur)).join(" + ") : "—"}
            </div>
          ))}
        </div>
      )}

      {/* Entries */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-card mb-8">
        <table className="w-full text-sm">
          <thead className="text-left text-mute">
            <tr className="border-b border-line">
              <th className="font-normal px-4 py-2.5" aria-sort={sort.key === "date" ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                <SortButton label="Date" on={sort.key === "date"} dir={sort.dir} onClick={() => setSort((s) => ({ key: "date", dir: s.key === "date" ? (s.dir === 1 ? -1 : 1) : -1 }))} />
              </th>
              <th className="font-normal px-4 py-2.5">Category</th>
              <th className="font-normal px-4 py-2.5">Description</th>
              <th className="font-normal px-4 py-2.5">Owner</th>
              <th className="font-normal px-4 py-2.5">Method</th>
              <th className="font-normal px-4 py-2.5 text-right" aria-sort={sort.key === "amount" ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                <SortButton label="Amount" on={sort.key === "amount"} dir={sort.dir} onClick={() => setSort((s) => ({ key: "amount", dir: s.key === "amount" ? (s.dir === 1 ? -1 : 1) : -1 }))} />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => (
              <Fragment key={e.id}>
                {months && (i === 0 || rows[i - 1].entry_date.slice(0, 7) !== e.entry_date.slice(0, 7)) && (
                  <tr className="border-b border-line bg-paper">
                    <th colSpan={5} scope="rowgroup" className="px-4 py-2 text-left font-medium">{monthLabel(e.entry_date.slice(0, 7))}</th>
                    <td className="px-4 py-2 text-right text-xs text-mute tabular-nums whitespace-nowrap">{sumOf(months.get(e.entry_date.slice(0, 7)) ?? [])}</td>
                  </tr>
                )}
                <tr onClick={() => setEditing(e)} onKeyDown={(ev) => ev.key === "Enter" && setEditing(e)} tabIndex={0} className="border-b border-line last:border-0 cursor-pointer hover:bg-paper focus-visible:bg-paper focus-visible:outline-none align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(e.entry_date)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {CATEGORY_LABEL[e.category]}
                    {e.salary_month && <span className="block text-xs text-mute">for {monthLabel(e.salary_month.slice(0, 7))}</span>}
                  </td>
                  <td className="px-4 py-2.5 min-w-56">
                    {e.description}
                    <span className="block text-xs text-mute">
                      {[e.party, e.reference_no && `Ref ${e.reference_no}`, e.gst_applicable && "GST", e.account_files?.length && `${e.account_files.length} receipt${e.account_files.length > 1 ? "s" : ""}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{e.owner_id ? nameOf(e.owner_id) : <span className="text-mute">Joint</span>}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{e.payment_method ?? <span className="text-mute">—</span>}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">{money(Number(e.amount), e.currency)}</td>
                </tr>
              </Fragment>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-mute">
                  {loading ? (
                    "Loading…"
                  ) : filtered ? (
                    <>
                      Nothing matches these filters.{" "}
                      <button className="underline underline-offset-2 hover:text-ink" onClick={clearFilters}>Clear filters</button>
                    </>
                  ) : (
                    <>
                      No entries for this period.{" "}
                      <button className="underline underline-offset-2 hover:text-ink" onClick={() => setEditing("new")}>Add the first one</button>
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 1 && (
            <tfoot>
              <tr className="border-t border-line">
                <td colSpan={5} className="px-4 py-2.5 text-mute">{rows.length} entries shown</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums whitespace-nowrap">{sumOf(rows)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Trend */}
      <h2 className="font-serif text-xl mb-3">Last {TREND_MONTHS} months</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-mute">
            <tr className="border-b border-line">
              <th className="font-normal px-4 py-2.5">Month</th>
              {ACCOUNT_CATEGORIES.map((c) => <th key={c} className="font-normal px-4 py-2.5 text-right">{CATEGORY_LABEL[c]}</th>)}
              <th className="font-normal px-4 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {trendRows.map((r) => {
              const inr = r.cells.reduce((a, c) => a + c.inr, 0);
              const usd = r.cells.reduce((a, c) => a + c.usd, 0);
              const current = r.month === monthKey(today());
              return (
                <tr key={r.month} className={`border-b border-line last:border-0 ${current ? "bg-paper" : ""}`}>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {monthLabel(r.month)}
                    {current && <span className="text-mute text-xs"> · so far</span>}
                  </td>
                  {r.cells.map((c, i) => (
                    <td key={i} className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                      {c.inr || c.usd ? (
                        <>
                          {c.inr > 0 && money(c.inr, "INR")}
                          {c.usd > 0 && <span className="block text-xs">{money(c.usd, "USD")}</span>}
                        </>
                      ) : (
                        <span className="text-ghost">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums whitespace-nowrap">
                    {inr || usd ? (
                      <>
                        {inr > 0 && money(inr, "INR")}
                        {usd > 0 && <span className="block text-xs font-normal">{money(usd, "USD")}</span>}
                      </>
                    ) : (
                      <span className="font-normal text-ghost">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EntryDialog
          entry={editing === "new" ? null : editing}
          partners={partners}
          onClose={() => setEditing(null)}
          onSaved={(another) => {
            if (!another) setEditing(null);
            load();
          }}
        />
      )}
      {paying && (
        <SalaryDialog
          people={people}
          onClose={() => setPaying(false)}
          onSaved={() => {
            setPaying(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function SortButton({ label, on, dir, onClick }: { label: string; on: boolean; dir: 1 | -1; onClick: () => void }) {
  return (
    <button className="inline-flex items-center gap-1 hover:text-ink" onClick={onClick}>
      {label}
      <span className="text-[10px]">{on ? (dir === 1 ? "▲" : "▼") : ""}</span>
    </button>
  );
}
