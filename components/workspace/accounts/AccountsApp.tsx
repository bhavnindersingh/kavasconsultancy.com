"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import {
  ACCOUNT_CATEGORIES,
  CATEGORY_LABEL,
  OFFERED_PAYER_ENTITIES,
  RETIRED_CATEGORIES,
  isIncome,
  isSpend,
  type AccountCategory,
  type AccountEntry,
  type Project,
  type Currency,
} from "@/lib/workspace/types";
import { useWorkspace } from "../WorkspaceContext";
import { formatDate, today } from "../tasks/bits";
import BooksView, { type BooksTab } from "./BooksView";
import EntryDialog from "./EntryDialog";
import ProjectsView from "./ProjectsView";
import SalaryDialog from "./SalaryDialog";
import { entityKey, money, monthKey, monthLabel, payerKey, payerLabel, periodRange, type Period } from "./ledger";

const TREND_MONTHS = 6;

type View = "entries" | "projects" | BooksTab;

const VIEWS: { key: View; label: string }[] = [
  { key: "entries", label: "Entries" },
  { key: "projects", label: "Projects" },
  { key: "pnl", label: "Profit & loss" },
  { key: "balance", label: "Balance sheet" },
  { key: "trial", label: "Trial balance" },
  { key: "ledgers", label: "Ledgers" },
];

const PERIOD_LABEL: Partial<Record<Period, string>> = {
  this_month: "This month",
  last_month: "Last month",
  this_fy: "This financial year",
  last_fy: "Last financial year",
  all: "All time",
  custom: "Custom dates",
};
/** Payer filter value for entries that don't say who paid. */
const NO_PAYER = "none";

export default function AccountsApp() {
  const { people, nameOf } = useWorkspace();
  const supabase = supabaseBrowser();
  const partners = useMemo(() => people.filter((p) => p.role === "partner"), [people]);
  // Ownership, not access: the equal partners who may pay, and Kavas Capital's.
  const firmPartners = useMemo(() => people.filter((p) => p.is_firm_partner), [people]);
  const capitalPartners = useMemo(() => people.filter((p) => p.in_kavas_capital), [people]);

  const [period, setPeriod] = useState<Period>("this_month");
  const [from, setFrom] = useState(() => periodRange("this_month").from);
  const [to, setTo] = useState(() => periodRange("this_month").to);
  const [category, setCategory] = useState<AccountCategory | "">("");
  const [owner, setOwner] = useState<string>("");
  // A payer key (see ledger.ts), or NO_PAYER for entries that don't say.
  const [payer, setPayer] = useState<string>("");
  const [search, setSearch] = useState("");
  const [gstOnly, setGstOnly] = useState(false);

  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [trend, setTrend] = useState<Pick<AccountEntry, "entry_date" | "category" | "currency" | "amount" | "owner_id">[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AccountEntry | "new" | null>(null);
  const [paying, setPaying] = useState(false);
  const [view, setView] = useState<View>("entries");
  const [projects, setProjects] = useState<Project[]>([]);
  // Prefill for a new entry, e.g. a partner fee recorded from Projects.
  const [newDefaults, setNewDefaults] = useState<Record<string, string> | undefined>();
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
    const [list, tr, pr] = await Promise.all([
      q,
      supabase.from("account_entries").select("entry_date, category, currency, amount, owner_id").gte("entry_date", trendFrom),
      supabase.from("projects").select("*, project_partner_fees(*)").order("name"),
    ]);
    setLoading(false);
    if (list.error || tr.error || pr.error) return setError((list.error ?? tr.error ?? pr.error)!.message);
    setProjects((pr.data ?? []) as Project[]);
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
      (e) =>
        (!category || e.category === category) &&
        (!owner || e.owner_id === owner) &&
        (!payer || payerKey(e) === (payer === NO_PAYER ? "" : payer)),
    );
    // The query returns newest first; only re-sort when asked to.
    if (sort.key === "date") return sort.dir === -1 ? kept : [...kept].reverse();
    return [...kept].sort((a, b) => (Number(a.amount) - Number(b.amount)) * sort.dir);
  }, [inPeriod, category, owner, payer, sort]);

  const filtered = !!(category || owner || payer || search.trim() || gstOnly);
  function clearFilters() {
    setCategory("");
    setOwner("");
    setPayer("");
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

  /** Money in and out of a set of entries, for subtotals: "+₹50,000 in · ₹12,000 out". */
  const flowOf = (list: AccountEntry[]) => {
    const inn = list.filter((e) => isIncome(e.category));
    const out = list.filter((e) => isSpend(e.category));
    return (
      <>
          {inn.length > 0 && <span className="text-[#067647]">+{sumOf(inn)} in</span>}
          {inn.length > 0 && out.length > 0 && <span className="text-mute"> · </span>}
          {out.length > 0 && <span>{sumOf(out)} out</span>}
      </>
    );
  };

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

  // Salaries paid in the period, per person.
  const salaries = useMemo(
    () =>
      people
        .map((p) => ({ p, list: inPeriod.filter((e) => e.category === "salary" && e.owner_id === p.id) }))
        .filter((x) => x.list.length),
    [people, inPeriod],
  );

  // Retired categories ("Personal") show only where old entries use them.
  const categories = useMemo(
    () => ACCOUNT_CATEGORIES.filter((c) => !RETIRED_CATEGORIES.includes(c) || entries.some((e) => e.category === c) || trend.some((e) => e.category === c)),
    [entries, trend],
  );
  const spendCategories = categories.filter((c) => isSpend(c));
  // With ten heads, cards and trend columns show only the ones with money in
  // them (a selected head always shows, so its card can be clicked off).
  const cardHeads = spendCategories.filter((c) => c === category || inPeriod.some((e) => e.category === c));
  const trendHeads = spendCategories.filter((c) => trend.some((e) => e.category === c));

  // In, out and the difference for the period, per currency.
  const flow = (["INR", "USD"] as Currency[])
    .map((cur) => {
      const of = inPeriod.filter((e) => e.currency === cur);
      const inn = of.filter((e) => isIncome(e.category)).reduce((a, e) => a + Number(e.amount), 0);
      const out = of.filter((e) => isSpend(e.category)).reduce((a, e) => a + Number(e.amount), 0);
      return { cur, inn, out, net: inn - out };
    })
    .filter((f) => f.cur === "INR" || f.inn || f.out);

  const trendRows = useMemo(() => {
    const months = Array.from({ length: TREND_MONTHS }, (_, i) => monthKey(today(), i - (TREND_MONTHS - 1)));
    return months.map((m) => {
      const ofMonth = trend.filter((e) => e.entry_date.startsWith(m) && (!owner || e.owner_id === owner));
      return {
        month: m,
        cells: trendHeads.map((c) => {
          const inr = ofMonth.filter((e) => e.category === c && e.currency === "INR").reduce((a, e) => a + Number(e.amount), 0);
          const usd = ofMonth.filter((e) => e.category === c && e.currency === "USD").reduce((a, e) => a + Number(e.amount), 0);
          return { inr, usd };
        }),
        invoiced: (["INR", "USD"] as Currency[]).map((cur) =>
          ofMonth.filter((e) => isIncome(e.category) && e.currency === cur).reduce((a, e) => a + Number(e.amount), 0),
        ),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trendHeads derives from trend and categories
  }, [trend, owner, categories]);

  function exportCsv() {
    const head = [
      "Date", "Category", "In / out", "Paid to (person)", "Salary month", "Party", "Description", "Amount", "Currency", "Paid / received by", "Payment method",
      "Paid from", "Reference", "Payee account", "Bank narration", "GST", "Vendor GSTIN", "Invoice no", "Invoice date",
      "GST rate", "Taxable value", "GST amount", "Notes", "Receipts",
    ];
    const cell = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((e) =>
      [
        e.entry_date, CATEGORY_LABEL[e.category], isIncome(e.category) ? "In" : "Out", e.owner_id ? nameOf(e.owner_id) : "Kavas Consultancy", e.salary_month?.slice(0, 7), e.party,
        e.description, e.amount, e.currency, payerLabel(payerKey(e), nameOf), e.payment_method, e.paid_from, e.reference_no, e.payee_account, e.bank_narration,
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
          <p className="text-sm text-mute mt-1">Kavas Consultancy’s money in from clients, and money out by head.</p>
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

      <div className="-mx-4 mb-5 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Accounts view">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setView(v.key)}
            className={`flex-none rounded-full px-4 py-1.5 text-sm ${view === v.key ? "bg-ink text-paper" : "border border-line bg-card hover:border-ghost"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

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
        {view === "entries" && (
          <>
          <select className="ws-input !w-auto" value={category} onChange={(e) => setCategory(e.target.value as AccountCategory | "")} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
          <select className="ws-input !w-auto" value={payer} onChange={(e) => setPayer(e.target.value)} aria-label="Paid by">
            <option value="">Paid by anyone</option>
            {firmPartners.map((p) => <option key={p.id} value={p.id}>Paid by {p.full_name || p.email}</option>)}
            {OFFERED_PAYER_ENTITIES.map((k) => <option key={k} value={entityKey(k)}>Paid by {payerLabel(entityKey(k), nameOf)}</option>)}
            <option value={NO_PAYER}>Payer not recorded</option>
          </select>
          <select className="ws-input !w-auto" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Salaries of">
            <option value="">Anyone’s pay</option>
            {/* Only a salary names a person, so this narrows to their salaries. */}
            {people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}’s pay</option>)}
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
          </>
        )}
      </div>

      {view === "projects" ? (
        <ProjectsView
          projects={projects}
          onChanged={load}
          onRecordFee={(projectId, partnerId, amount) => {
            const pr = projects.find((x) => x.id === projectId);
            setNewDefaults({
              category: "partner_fee",
              project_id: projectId,
              owner_id: partnerId,
              amount: String(amount),
              description: `Project fee — ${pr?.name ?? "project"}`,
            });
            setEditing("new");
          }}
        />
      ) : view !== "entries" ? (
        <BooksView tab={view} from={from} to={to} periodLabel={period === "custom" ? `${from ? formatDate(from) : "Start"} – ${to ? formatDate(to) : "today"}` : (PERIOD_LABEL[period] ?? "")} />
      ) : (
      <>

      {/* In, out, net */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={() => setCategory((cur) => (cur === "invoice" ? "" : "invoice"))}
          className={`rounded-2xl border p-4 text-left transition-colors ${category === "invoice" ? "border-[#067647] bg-[#f6fef9]" : "border-line bg-[#f6fef9] hover:border-[#abefc6]"}`}
        >
          <span className="block text-sm text-[#067647]">Money in · invoiced</span>
          {flow.map((f) => (
            <span key={f.cur} className={`block tabular-nums ${f.cur === "INR" ? "font-serif text-2xl mt-1" : "text-sm"}`}>{money(f.inn, f.cur)}</span>
          ))}
        </button>
        <div className="rounded-2xl border border-line bg-card p-4">
          <span className="block text-sm text-mute">Money out · spent</span>
          {flow.map((f) => (
            <span key={f.cur} className={`block tabular-nums ${f.cur === "INR" ? "font-serif text-2xl mt-1" : "text-sm"}`}>{money(f.out, f.cur)}</span>
          ))}
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <span className="block text-sm text-mute">Net · in minus out</span>
          {flow.map((f) => (
            <span key={f.cur} className={`block tabular-nums ${f.cur === "INR" ? "font-serif text-2xl mt-1" : "text-sm"} ${f.net < 0 ? "text-[#b42318]" : f.net > 0 ? "text-[#067647]" : ""}`}>
              {f.net > 0 ? "+" : ""}{money(f.net, f.cur)}
            </span>
          ))}
        </div>
      </div>

      <WhoPaid entries={entries} partners={firmPartners} capitalPartners={capitalPartners} nameOf={nameOf} onPick={setPayer} onBalances={() => setView("balance")} />

      {/* Spending by category */}
      {cardHeads.length === 0 && !loading && <p className="mb-4 px-1 text-sm text-mute">No spending in this period yet.</p>}
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3 lg:grid-cols-5">
        {cardHeads.map((c) => {
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

      <p className="mb-4 px-1 text-sm text-mute">
        {inPeriod.length} entr{inPeriod.length === 1 ? "y" : "ies"} in this period
      </p>

      {salaries.length > 0 && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-6 px-1">
          <span className="text-mute">Salaries paid:</span>
          {salaries.map(({ p, list }) => (
            <div key={p.id}>
              <span className="font-medium">{p.full_name || p.email}</span> <span className="tabular-nums">{sumOf(list)}</span>
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
              <th className="font-normal px-4 py-2.5">Paid to / by</th>
              <th className="font-normal px-4 py-2.5">Paid / received by</th>
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
                    <td className="px-4 py-2 text-right text-xs tabular-nums whitespace-nowrap">{flowOf(months.get(e.entry_date.slice(0, 7)) ?? [])}</td>
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
                      {[e.project_id && `Project: ${projects.find((x) => x.id === e.project_id)?.name ?? "—"}`, e.owner_id && e.party, isIncome(e.category) && e.invoice_no && `Invoice ${e.invoice_no}`, e.reference_no && `Ref ${e.reference_no}`, e.gst_applicable && "GST", e.account_files?.length && `${e.account_files.length} receipt${e.account_files.length > 1 ? "s" : ""}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{e.owner_id ? nameOf(e.owner_id) : e.party ?? <span className="text-mute">—</span>}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {e.category === "partner_fee" ? (
                      <span className="text-mute">Owed to {nameOf(e.owner_id).split(" ")[0]}</span>
                    ) : payerKey(e) ? (
                      payerLabel(payerKey(e), nameOf)
                    ) : (
                      <span className="text-[#b54708]">Not recorded</span>
                    )}
                    {e.payment_method && <span className="block text-xs text-mute">{e.payment_method}</span>}
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${isIncome(e.category) ? "text-[#067647]" : ""}`}>
                    {isIncome(e.category) ? "+" : ""}
                    {money(Number(e.amount), e.currency)}
                  </td>
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
                <td className="px-4 py-2.5 text-right font-medium tabular-nums whitespace-nowrap">{flowOf(rows)}</td>
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
              {trendHeads.map((c) => <th key={c} className="font-normal px-4 py-2.5 text-right">{CATEGORY_LABEL[c]}</th>)}
              <th className="font-normal px-4 py-2.5 text-right">Spent</th>
              <th className="font-normal px-4 py-2.5 text-right">Invoiced</th>
              <th className="font-normal px-4 py-2.5 text-right">Net</th>
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
                  <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-[#067647]">
                    {r.invoiced[0] || r.invoiced[1] ? (
                      <>
                        {r.invoiced[0] > 0 && money(r.invoiced[0], "INR")}
                        {r.invoiced[1] > 0 && <span className="block text-xs">{money(r.invoiced[1], "USD")}</span>}
                      </>
                    ) : (
                      <span className="text-ghost">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums whitespace-nowrap">
                    {inr || usd || r.invoiced[0] || r.invoiced[1] ? (
                      <>
                        <Signed v={r.invoiced[0] - inr} cur="INR" />
                        {(usd > 0 || r.invoiced[1] > 0) && <span className="block text-xs"><Signed v={r.invoiced[1] - usd} cur="USD" /></span>}
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

      </>
      )}

      {editing && (
        <EntryDialog
          entry={editing === "new" ? null : editing}
          projects={projects}
          defaults={editing === "new" ? newDefaults : undefined}
          partners={partners}
          onClose={() => {
            setEditing(null);
            setNewDefaults(undefined);
          }}
          onSaved={(another) => {
            if (!another) {
              setEditing(null);
              setNewDefaults(undefined);
            }
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

/** An amount with its sign and colour: green above zero, red below. */
function Signed({ v, cur }: { v: number; cur: Currency }) {
  return <span className={v < 0 ? "text-[#b42318]" : v > 0 ? "text-[#067647]" : ""}>{v > 0 ? "+" : ""}{money(v, cur)}</span>;
}

/**
 * What each partner, and Kavas Capital, paid and received in the period.
 * What that leaves each of them owed or holding — after project fees, with
 * the rest kept as Cash reserves — is on the Balance sheet tab.
 */
function WhoPaid({
  entries,
  partners,
  capitalPartners,
  nameOf,
  onPick,
  onBalances,
}: {
  entries: AccountEntry[];
  partners: { id: string; full_name: string | null; email: string }[];
  capitalPartners: { id: string; full_name: string | null; email: string }[];
  nameOf: (id: string | null) => string;
  onPick: (payer: string) => void;
  onBalances: () => void;
}) {
  if (!entries.length) return null;
  if (!partners.length)
    return (
      <p className="mb-6 rounded-lg bg-[#fffaeb] px-3 py-2 text-sm text-[#b54708]">
        The app doesn’t know who owns the firm yet — set it on the Team page (⋯ → Partner in the firm) to see who has paid what.
      </p>
    );

  const capitalKey = entityKey("kavas_capital");
  const capitalName = payerLabel(capitalKey, nameOf);
  const flowFor = (key: string) => {
    const of = entries.filter((e) => e.currency === "INR" && payerKey(e) === key);
    return {
      out: of.filter((e) => isSpend(e.category)).reduce((a, e) => a + Number(e.amount), 0),
      inn: of.filter((e) => isIncome(e.category)).reduce((a, e) => a + Number(e.amount), 0),
    };
  };
  const unrecorded = entries.filter((e) => isSpend(e.category) || isIncome(e.category)).filter((e) => !payerKey(e)).length;
  const capital = flowFor(capitalKey);
  const capitalFor = capitalPartners.map((p) => (p.full_name || p.email).split(" ")[0]).join(" and ");
  const card = (key: string, title: string, f: { out: number; inn: number }, note?: string, tint = false) => (
    <button key={key} onClick={() => onPick(key)} className={`rounded-xl border border-line p-3 text-left hover:border-ghost ${tint ? "bg-paper" : ""}`}>
      <span className="block font-medium">{title}</span>
      <span className="block text-sm tabular-nums">Paid {money(f.out, "INR")}</span>
      <span className={`block text-sm tabular-nums ${f.inn ? "text-[#067647]" : "text-mute"}`}>Received {money(f.inn, "INR")}</span>
      {note && <span className="mt-1 block text-xs text-mute">{note}</span>}
    </button>
  );

  return (
    <section className="mb-6 rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">Who paid and received, this period</h2>
        <button className="text-xs text-mute underline underline-offset-2 hover:text-ink" onClick={onBalances}>
          Who’s owed what → Balance sheet
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {partners.map((p) => card(p.id, p.full_name || p.email, flowFor(p.id)))}
        {card(capitalKey, capitalName, capital, capitalFor ? `For ${capitalFor}, equally` : undefined, true)}
      </div>
      {unrecorded > 0 && (
        <p className="mt-3 text-sm text-[#b54708]">
          {unrecorded} entr{unrecorded === 1 ? "y doesn’t" : "ies don’t"} say who paid.{" "}
          <button className="underline underline-offset-2" onClick={() => onPick(NO_PAYER)}>Show {unrecorded === 1 ? "it" : "them"}</button>
        </p>
      )}
    </section>
  );
}
