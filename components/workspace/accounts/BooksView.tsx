"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import type { AccountEntry, Project } from "@/lib/workspace/types";
import { useWorkspace } from "../WorkspaceContext";
import { formatDate } from "../tasks/bits";
import { buildBooks, RESERVES, type Account, type Books } from "./books";
import { money } from "./ledger";

export type BooksTab = "pnl" | "balance" | "trial" | "ledgers";

const inr = (v: number) => money(Math.abs(v), "INR");
/** A balance as Dr/Cr. Debit is positive. */
const side = (v: number) => (Math.abs(v) < 0.005 ? "—" : `${inr(v)} ${v > 0 ? "Dr" : "Cr"}`);

/**
 * P&L, balance sheet, trial balance and ledgers for the chosen period, built
 * from the entries (see books.ts). Balance-sheet accounts carry forward from
 * every earlier entry, so it reads everything up to the period's end.
 */
export default function BooksView({ tab, from, to, periodLabel }: { tab: BooksTab; from: string; to: string; periodLabel: string }) {
  const { people, nameOf } = useWorkspace();
  const supabase = supabaseBrowser();
  const [entries, setEntries] = useState<AccountEntry[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let q = supabase.from("account_entries").select("*").order("entry_date");
    if (to) q = q.lte("entry_date", to);
    Promise.all([q, supabase.from("projects").select("id, name, client, notes, is_active, created_at")]).then(([list, pr]) => {
      if (cancelled) return;
      if (list.error || pr.error) return setError((list.error ?? pr.error)!.message);
      setEntries((list.data ?? []) as AccountEntry[]);
      setProjects((pr.data ?? []) as Project[]);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, to]);

  const partners = useMemo(() => people.filter((p) => p.is_firm_partner), [people]);
  const capitalPartners = useMemo(() => people.filter((p) => p.in_kavas_capital), [people]);
  const inrEntries = useMemo(() => (entries ?? []).filter((e) => e.currency === "INR"), [entries]);
  const otherCurrency = (entries ?? []).length - inrEntries.length;
  const books = useMemo(
    () =>
      entries
        ? buildBooks(inrEntries, {
            from,
            to,
            partners,
            capitalPartners,
            nameOfId: nameOf,
            projectName: (id) => projects.find((x) => x.id === id)?.name ?? "Project",
          })
        : null,
    [entries, inrEntries, from, to, partners, capitalPartners, nameOf, projects],
  );

  if (error) return <p className="rounded-lg bg-[#fef3f2] px-3 py-2 text-sm text-[#b42318]">{error}</p>;
  if (!books) return <p className="py-10 text-center text-mute">Loading the books…</p>;

  return (
    <div className="space-y-4">
      {books.unrecorded > 0 && (
        <p className="rounded-lg bg-[#fffaeb] px-3 py-2 text-sm text-[#b54708]">
          {books.unrecorded} entr{books.unrecorded === 1 ? "y has" : "ies have"} no payer, so {books.unrecorded === 1 ? "it sits" : "they sit"} in Suspense
          until you open {books.unrecorded === 1 ? "it" : "them"} under Entries and pick who paid.
        </p>
      )}
      {otherCurrency > 0 && (
        <p className="rounded-lg bg-cream px-3 py-2 text-sm">
          {otherCurrency} USD entr{otherCurrency === 1 ? "y is" : "ies are"} left out: the books are kept in rupees.
        </p>
      )}
      {tab === "pnl" && <ProfitAndLoss books={books} periodLabel={periodLabel} nameOf={nameOf} partnerNames={partners} />}
      {tab === "balance" && <BalanceSheet books={books} asAt={to} />}
      {tab === "trial" && <TrialBalance books={books} periodLabel={periodLabel} />}
      {tab === "ledgers" && <Ledgers books={books} />}
    </div>
  );
}

function Sheet({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line px-5 py-4">
        <h2 className="font-serif text-2xl">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-mute">{sub}</p>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Line({ label, value, strong, indent, tone, note }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; indent?: boolean; tone?: "good" | "bad"; note?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? "border-t border-line font-medium" : ""}`}>
      <span className={indent ? "pl-4" : ""}>
        {label}
        {note && <span className="block text-xs font-normal text-mute">{note}</span>}
      </span>
      <span className={`tabular-nums whitespace-nowrap ${tone === "good" ? "text-[#067647]" : tone === "bad" ? "text-[#b42318]" : ""}`}>{value}</span>
    </div>
  );
}

function ProfitAndLoss({
  books,
  periodLabel,
  nameOf,
  partnerNames,
}: {
  books: Books;
  periodLabel: string;
  nameOf: (id: string | null) => string;
  partnerNames: { id: string; full_name: string | null; email: string }[];
}) {
  const b = books;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Sheet title="Profit & loss" sub={periodLabel}>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-mute">Income</p>
        {b.income.map((x) => <Line key={x.account.key} indent label={x.account.name} value={inr(x.amount)} />)}
        <Line strong label="Total income" value={inr(b.totalIncome)} />

        <p className="mb-1 mt-4 text-xs font-medium uppercase tracking-wide text-mute">Expenses</p>
        {b.expenses.length ? (
          b.expenses.map((x) => <Line key={x.account.key} indent label={x.account.name} value={inr(x.amount)} />)
        ) : (
          <Line indent label={<span className="text-mute">None</span>} value="—" />
        )}
        <Line strong label="Total expenses" value={inr(b.totalExpenses)} />

        <div className="mt-4 rounded-xl bg-paper px-3">
          <Line
            strong
            label={b.netProfit >= 0 ? "Net profit" : "Net loss"}
            value={inr(b.netProfit)}
            tone={b.netProfit > 0 ? "good" : b.netProfit < 0 ? "bad" : undefined}
          />
        </div>
      </Sheet>

      <Sheet title="Where the profit goes" sub="Partners earn through project fees and any salary; the rest stays in the firm">
        <Line label={b.netProfit >= 0 ? "Net profit" : "Net loss"} value={inr(b.netProfit)} />
        {b.remuneration > 0 && (
          <>
            <p className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-mute">Less: partners’ remuneration</p>
            {[...b.remunerationBy].map(([id, v]) => <Line key={id} indent label={nameOf(id)} value={inr(v)} />)}
          </>
        )}
        {b.projectFees > 0 && (
          <>
            <p className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-mute">Less: partners’ project fees</p>
            {[...b.projectFeesBy].map(([id, v]) => <Line key={id} indent label={nameOf(id)} value={inr(v)} />)}
          </>
        )}
        <div className="mt-3 rounded-xl bg-paper px-3">
          <Line
            strong
            label={b.toReserves >= 0 ? "Kept in Cash reserves" : "Taken from Cash reserves"}
            value={inr(b.toReserves)}
            tone={b.toReserves > 0 ? "good" : b.toReserves < 0 ? "bad" : undefined}
          />
        </div>
        <p className="mt-3 text-xs text-mute">
          {partnerNames.length === 3 ? "The three of you" : "The partners"} own the reserves equally. Cash reserves now: {inr(b.reserves.closing)}.
        </p>
      </Sheet>
    </div>
  );
}

function BalanceSheet({ books, asAt }: { books: Books; asAt: string }) {
  const owed = books.closing.filter((c) => c.balance < -0.005); // credit: the firm owes them
  const owing = books.closing.filter((c) => c.balance > 0.005); // debit: they owe the firm
  const sum = (list: typeof owed) => list.reduce((a, c) => a + Math.abs(c.balance), 0);
  const label = (a: Account) => a.name.replace(" — current account", "");
  return (
    <Sheet title="Balance sheet" sub={asAt ? `As at ${formatDate(asAt)}` : "As at today"}>
      <p className="mb-3 text-sm text-mute">
        The firm keeps no bank account of its own: partners (and Kavas Capital, for Rahul and Bhavninder) pay and receive for it, so its money
        is held by whichever partner received it. That’s the firm’s asset; what it owes partners and its Cash reserves are the other side.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-mute">Funds and what the firm owes</p>
          <Line indent label="Cash reserves" value={`${books.reserves.closing < 0 ? "−" : ""}${inr(books.reserves.closing)}`} note="Profit kept by the firm, owned equally" />
          {owed.map((c) => <Line key={c.account.key} indent label={`Owed to ${label(c.account)}`} value={inr(c.balance)} note={c.account.group === "other" ? "Not a partner — sort these out" : undefined} />)}
          <Line strong label="Total" value={inr(sum(owed) + books.reserves.closing)} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-mute">Firm’s money, held by</p>
          {owing.length ? owing.map((c) => <Line key={c.account.key} indent label={label(c.account)} value={inr(c.balance)} note="Received for the firm, not yet passed on" />) : <Line indent label={<span className="text-mute">Nobody</span>} value="—" />}
          <Line strong label="Total" value={inr(sum(owing))} />
        </div>
      </div>

      <p className="mb-1 mt-6 text-xs font-medium uppercase tracking-wide text-mute">Partners’ current accounts</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-mute">
            <tr className="border-b border-line">
              <th className="py-2 pr-4 font-normal">Account</th>
              <th className="py-2 pr-4 text-right font-normal">Brought forward</th>
              <th className="py-2 pr-4 text-right font-normal">Paid / received</th>
              <th className="py-2 text-right font-normal">Balance</th>
            </tr>
          </thead>
          <tbody>
            {books.closing.map((c) => (
              <tr key={c.account.key} className="border-b border-line last:border-0">
                <td className="py-2 pr-4">{label(c.account)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{side(c.opening)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{side(c.movement)}</td>
                <td className={`py-2 text-right font-medium tabular-nums ${c.balance < -0.005 ? "text-[#067647]" : c.balance > 0.005 ? "text-[#b42318]" : ""}`}>
                  {Math.abs(c.balance) < 0.005 ? "Even" : c.balance < 0 ? `Owed ${inr(c.balance)}` : `Holds ${inr(c.balance)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-mute">Dr = the partner holds the firm’s money; Cr = the firm owes the partner.</p>
    </Sheet>
  );
}

function TrialBalance({ books, periodLabel }: { books: Books; periodLabel: string }) {
  const groups: { title: string; test: (a: Account) => boolean }[] = [
    { title: "Partners’ current accounts", test: (a) => a.group === "partner" },
    { title: "Income", test: (a) => a.group === "income" },
    { title: "Expenses", test: (a) => a.group === "expense" },
    { title: "Appropriation", test: (a) => a.group === "appropriation" },
    { title: "Reserves", test: (a) => a.group === "reserve" },
    { title: "Other", test: (a) => a.group === "other" },
  ];
  const balanced = Math.abs(books.trialDr - books.trialCr) < 0.01;
  return (
    <Sheet title="Trial balance" sub={`${periodLabel} · before the profit goes to reserves`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-mute">
            <tr className="border-b border-line">
              <th className="py-2 pr-4 font-normal">Account</th>
              <th className="py-2 pr-4 text-right font-normal">Debit</th>
              <th className="py-2 text-right font-normal">Credit</th>
            </tr>
          </thead>
          {groups.map((g) => {
            const rows = books.trial.filter((r) => g.test(r.account));
            if (!rows.length) return null;
            return (
              <tbody key={g.title}>
                <tr>
                  <th colSpan={3} className="pt-3 pb-1 text-left text-xs font-medium uppercase tracking-wide text-mute">{g.title}</th>
                </tr>
                {rows.map((r) => (
                  <tr key={r.account.key} className="border-b border-line">
                    <td className="py-1.5 pr-4 pl-4">{r.account.name}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{r.dr ? inr(r.dr) : ""}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.cr ? inr(r.cr) : ""}</td>
                  </tr>
                ))}
              </tbody>
            );
          })}
          <tfoot>
            <tr className="border-t-2 border-ink font-medium">
              <td className="py-2 pr-4">Total</td>
              <td className="py-2 pr-4 text-right tabular-nums">{inr(books.trialDr)}</td>
              <td className="py-2 text-right tabular-nums">{inr(books.trialCr)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className={`mt-3 text-sm ${balanced ? "text-[#067647]" : "text-[#b42318]"}`}>{balanced ? "✓ Debits equal credits." : "Debits and credits don’t agree — tell Claude."}</p>
    </Sheet>
  );
}

function Ledgers({ books }: { books: Books }) {
  const order: Record<string, number> = { partner: 0, reserve: 1, income: 2, expense: 3, appropriation: 4, other: 5 };
  const accounts = [...books.accounts].sort((a, b) => order[a.group] - order[b.group] || a.name.localeCompare(b.name));
  const [open, setOpen] = useState<string>(accounts[0]?.key ?? "");
  const current = accounts.find((a) => a.key === open) ?? accounts[0];
  if (!current) return <p className="text-mute">No accounts yet.</p>;
  const l = books.ledger(current.key);
  const balanceSheet = current.group === "partner" || current.group === "other" || current.key === RESERVES;
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav className="rounded-2xl border border-line bg-card p-2" aria-label="Ledger accounts">
        {accounts.map((a) => (
          <button
            key={a.key}
            onClick={() => setOpen(a.key)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${a.key === current.key ? "bg-ink text-paper" : "hover:bg-cream"}`}
          >
            {a.name}
          </button>
        ))}
      </nav>
      <Sheet title={current.name} sub={balanceSheet ? "Brought forward from earlier periods" : "This period"}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-mute">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-normal">Date</th>
                <th className="py-2 pr-4 font-normal">Particulars</th>
                <th className="py-2 pr-4 text-right font-normal">Debit</th>
                <th className="py-2 pr-4 text-right font-normal">Credit</th>
                <th className="py-2 text-right font-normal">Balance</th>
              </tr>
            </thead>
            <tbody>
              {balanceSheet && (
                <tr className="border-b border-line text-mute">
                  <td className="py-1.5 pr-4" />
                  <td className="py-1.5 pr-4">Opening balance</td>
                  <td className="py-1.5 pr-4" />
                  <td className="py-1.5 pr-4" />
                  <td className="py-1.5 text-right tabular-nums">{side(l.opening)}</td>
                </tr>
              )}
              {l.rows.map((r, i) => (
                <tr key={`${r.entryId}-${i}`} className="border-b border-line align-top">
                  <td className="py-1.5 pr-4 whitespace-nowrap">{r.date ? formatDate(r.date) : ""}</td>
                  <td className="py-1.5 pr-4">{r.narration}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{r.dr ? inr(r.dr) : ""}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{r.cr ? inr(r.cr) : ""}</td>
                  <td className="py-1.5 text-right tabular-nums">{side(r.balance)}</td>
                </tr>
              ))}
              {!l.rows.length && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-mute">Nothing in this period.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink font-medium">
                <td className="py-2 pr-4" />
                <td className="py-2 pr-4">Closing balance</td>
                <td className="py-2 pr-4" />
                <td className="py-2 pr-4" />
                <td className="py-2 text-right tabular-nums">{side(l.closing)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Sheet>
    </div>
  );
}
