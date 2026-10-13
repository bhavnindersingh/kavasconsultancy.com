import { CATEGORY_LABEL, isIncome, PAYER_ENTITY_LABEL, type AccountCategory, type AccountEntry } from "@/lib/workspace/types";

// ── The books ──────────────────────────────────────────────────────────────
// Kavas Consultancy is a partnership with no bank account of its own: every
// bill is paid, and every client payment received, by a partner or by Kavas
// Capital (its partners' own firm). Partners earn through fees on the
// projects they work on (and any salary); whatever profit is left is kept by
// the firm as Cash reserves, not shared out. Each entry posts in double entry:
//
//   bill paid by a partner      Dr expense head            Cr that partner
//   bill paid by Kavas Capital  Dr expense head            Cr its partners, equally
//   client pays a partner       Dr that partner            Cr fees from clients
//   salary to a firm partner    Dr partners' remuneration  Cr payer
//   partner's project fee       Dr partners' project fees  Cr that partner
//                               (owed to them; no money moves)
//   a retired "personal" entry  Dr the partner it was for (drawings)  Cr payer
//
// Remuneration and project fees are appropriations of profit, not expenses.
// What's left of the period's profit is transferred to Cash reserves.
//
// A partner's current account in CREDIT means the firm owes them; in DEBIT,
// they hold the firm's money. Entries with no payer post to Suspense so the
// books still balance, and are flagged. Amounts are as entered
// (GST-inclusive), in one currency.

export type Group = "income" | "expense" | "appropriation" | "reserve" | "partner" | "other";

export type Account = { key: string; name: string; group: Group };

export type Posting = {
  date: string;
  entryId: string;
  account: string;
  dr: number;
  cr: number;
  narration: string;
};

type Person = { id: string; full_name: string | null; email: string };

export const FEES = "income:fees";
export const REMUNERATION = "approp:remuneration";
export const PROJECT_FEES = "approp:project_fees";
export const RESERVES = "reserve:cash";
export const SUSPENSE = "other:suspense";
const CAPITAL_UNSPLIT = "other:kavas_capital";

const nameOf = (p: Person) => p.full_name || p.email;
const round = (v: number) => Math.round(v * 100) / 100;
/** Balance-sheet accounts: carried forward from period to period. */
const carried = (g: Group) => g === "partner" || g === "other" || g === "reserve";

/** Split `amount` into `n` parts that add back exactly (paise go to the first). */
function split(amount: number, n: number) {
  const base = Math.floor((amount / n) * 100) / 100;
  const parts = Array.from({ length: n }, () => base);
  parts[0] = round(amount - base * (n - 1));
  return parts;
}

export function buildBooks(
  entries: AccountEntry[],
  opts: {
    from: string;
    to: string;
    partners: Person[];
    capitalPartners: Person[];
    nameOfId: (id: string | null) => string;
    projectName?: (id: string | null) => string;
  },
) {
  const { from, partners, capitalPartners, nameOfId } = opts;
  const projectName = opts.projectName ?? (() => "");
  const accounts = new Map<string, Account>();
  const add = (key: string, name: string, group: Group) => {
    if (!accounts.has(key)) accounts.set(key, { key, name, group });
    return key;
  };
  const partnerKey = (id: string) => {
    const p = partners.find((x) => x.id === id);
    return add(`partner:${id}`, `${p ? nameOf(p) : nameOfId(id)} — current account`, "partner");
  };
  partners.forEach((p) => partnerKey(p.id));
  add(FEES, "Fees from clients", "income");
  add(RESERVES, "Cash reserves", "reserve");
  const firmIds = new Set(partners.map((p) => p.id));
  const capitalSplit = capitalPartners.filter((p) => firmIds.has(p.id));

  /** Who the money came from (or went to), as account keys with shares of the amount. */
  function payer(e: AccountEntry, amount: number): { account: string; amount: number; via?: string }[] {
    if (e.paid_by_id) return [{ account: partnerKey(e.paid_by_id), amount }];
    if (e.paid_by_entity === "kavas_capital") {
      if (!capitalSplit.length) return [{ account: add(CAPITAL_UNSPLIT, PAYER_ENTITY_LABEL.kavas_capital, "other"), amount }];
      const parts = split(amount, capitalSplit.length);
      return capitalSplit.map((p, i) => ({ account: partnerKey(p.id), amount: parts[i], via: PAYER_ENTITY_LABEL.kavas_capital }));
    }
    if (e.paid_by_entity) return [{ account: add(`other:${e.paid_by_entity}`, PAYER_ENTITY_LABEL[e.paid_by_entity], "other"), amount }];
    return [{ account: add(SUSPENSE, "Suspense — payer not recorded", "other"), amount }];
  }

  const postings: Posting[] = [];
  for (const e of [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date) || a.created_at.localeCompare(b.created_at))) {
    const amount = round(Number(e.amount));
    if (!amount) continue;
    const project = e.project_id ? ` [${projectName(e.project_id)}]` : "";
    const base = [e.description, e.party].filter(Boolean).join(" — ") + project;
    const post = (account: string, dr: number, cr: number, narration = base) =>
      postings.push({ date: e.entry_date, entryId: e.id, account, dr: round(dr), cr: round(cr), narration });

    // A project fee is owed to the partner: no payer, no money moving.
    if (e.category === "partner_fee" && e.owner_id) {
      post(add(PROJECT_FEES, "Partners’ project fees", "appropriation"), amount, 0, `${base} — ${nameOfId(e.owner_id)}`);
      post(partnerKey(e.owner_id), 0, amount, `Project fee${project}`);
      continue;
    }

    const sides = payer(e, amount);
    if (isIncome(e.category)) {
      post(FEES, 0, amount);
      sides.forEach((s) => post(s.account, s.amount, 0, s.via ? `${base} (received by ${s.via})` : base));
      continue;
    }
    let debit: string;
    if (e.category === "salary" && e.owner_id && firmIds.has(e.owner_id)) {
      debit = add(REMUNERATION, "Partners’ remuneration", "appropriation");
    } else if (e.category === "personal" && e.owner_id) {
      debit = partnerKey(e.owner_id); // drawings
    } else if (e.category === "salary") {
      debit = add("expense:salary", "Salaries — team", "expense");
    } else {
      debit = add(`expense:${e.category}`, CATEGORY_LABEL[e.category as AccountCategory], "expense");
    }
    const who = e.category === "salary" && e.owner_id ? ` — ${nameOfId(e.owner_id)}` : "";
    post(debit, amount, 0, `${base}${who}`);
    sides.forEach((s) => post(s.account, 0, s.amount, s.via ? `${base}${who} (paid by ${s.via})` : `${base}${who}`));
  }

  const before = from ? postings.filter((p) => p.date < from) : [];
  const during = from ? postings.filter((p) => p.date >= from) : postings;

  const net = (list: Posting[], key: string) => round(list.filter((p) => p.account === key).reduce((a, p) => a + p.dr - p.cr, 0));
  const groupOf = (key: string) => accounts.get(key)!.group;
  /** What goes to reserves: income less expenses less remuneration and project fees. */
  const retained = (list: Posting[]) =>
    round(-list.filter((p) => ["income", "expense", "appropriation"].includes(groupOf(p.account))).reduce((a, p) => a + p.dr - p.cr, 0));

  // Opening balances: balance-sheet accounts carry forward, with every
  // earlier period's retained profit already in Cash reserves. Income,
  // expenses and appropriations start each period at nil.
  const opening = new Map<string, number>();
  for (const a of accounts.values()) {
    if (a.group === "reserve") opening.set(a.key, -retained(before));
    else if (carried(a.group)) opening.set(a.key, net(before, a.key));
  }

  // P&L for the period.
  const income = [...accounts.values()].filter((a) => a.group === "income").map((a) => ({ account: a, amount: -net(during, a.key) }));
  const expenses = [...accounts.values()]
    .filter((a) => a.group === "expense")
    .map((a) => ({ account: a, amount: net(during, a.key) }))
    .filter((x) => x.amount)
    .sort((a, b) => b.amount - a.amount);
  const totalIncome = round(income.reduce((a, x) => a + x.amount, 0));
  const totalExpenses = round(expenses.reduce((a, x) => a + x.amount, 0));
  const netProfit = round(totalIncome - totalExpenses);

  const inPeriod = (e: AccountEntry) => !from || e.entry_date >= from;
  const sumBy = (test: (e: AccountEntry) => boolean) => {
    const m = new Map<string, number>();
    for (const e of entries) if (inPeriod(e) && e.owner_id && test(e)) m.set(e.owner_id, round((m.get(e.owner_id) ?? 0) + Number(e.amount)));
    return m;
  };
  const remuneration = net(during, REMUNERATION);
  const remunerationBy = sumBy((e) => e.category === "salary" && firmIds.has(e.owner_id!));
  const projectFees = net(during, PROJECT_FEES);
  const projectFeesBy = sumBy((e) => e.category === "partner_fee");
  const toReserves = round(netProfit - remuneration - projectFees);

  // Trial balance: opening balance-sheet balances, plus the period's
  // postings, before the profit goes to reserves.
  const trial = [...accounts.values()]
    .map((a) => {
      const bal = round((opening.get(a.key) ?? 0) + net(during, a.key));
      return { account: a, dr: bal > 0 ? bal : 0, cr: bal < 0 ? -bal : 0 };
    })
    .filter((r) => r.dr || r.cr || r.account.group === "partner");
  const trialDr = round(trial.reduce((a, r) => a + r.dr, 0));
  const trialCr = round(trial.reduce((a, r) => a + r.cr, 0));

  // Balance sheet: after the period's profit goes to reserves.
  const closingOf = (key: string) => round((opening.get(key) ?? 0) + net(during, key) - (key === RESERVES ? toReserves : 0));
  const closing = [...accounts.values()]
    .filter((a) => a.group === "partner" || a.group === "other")
    .map((a) => ({ account: a, opening: opening.get(a.key) ?? 0, movement: net(during, a.key), balance: closingOf(a.key) }));
  const reserves = { opening: -(opening.get(RESERVES) ?? 0), added: toReserves, closing: -closingOf(RESERVES) };

  // Ledgers: each account's postings in the period with a running balance.
  const ledger = (key: string) => {
    let run = opening.get(key) ?? 0;
    const rows = during
      .filter((p) => p.account === key)
      .map((p) => {
        run = round(run + p.dr - p.cr);
        return { ...p, balance: run };
      });
    if (key === RESERVES && toReserves) {
      run = round(run - toReserves);
      rows.push({
        date: opts.to || rows.at(-1)?.date || "",
        entryId: "",
        account: key,
        dr: toReserves < 0 ? -toReserves : 0,
        cr: toReserves > 0 ? toReserves : 0,
        narration: toReserves > 0 ? "Profit for the period, kept by the firm" : "Loss for the period, met from reserves",
        balance: run,
      });
    }
    return { opening: opening.get(key) ?? 0, rows, closing: run };
  };

  const unrecorded = entries.filter((e) => e.category !== "partner_fee" && !e.paid_by_id && !e.paid_by_entity && inPeriod(e)).length;

  return {
    accounts: [...accounts.values()],
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netProfit,
    remuneration,
    remunerationBy,
    projectFees,
    projectFeesBy,
    toReserves,
    reserves,
    trial,
    trialDr,
    trialCr,
    closing,
    ledger,
    unrecorded,
    capitalSplit,
  };
}

export type Books = ReturnType<typeof buildBooks>;

// ── Projects ───────────────────────────────────────────────────────────────

export type ProjectRule = { partner_id: string; mode: "fixed" | "percent"; value: number };

/**
 * One project's numbers, all time: what the client paid, what it cost, the
 * partners' fees due under its rules and recorded so far, and what it leaves
 * for Cash reserves once every fee due is paid.
 */
export function projectSummary(entries: AccountEntry[], projectId: string, rules: ProjectRule[]) {
  const mine = entries.filter((e) => e.project_id === projectId && e.currency === "INR");
  const sum = (list: AccountEntry[]) => round(list.reduce((a, e) => a + Number(e.amount), 0));
  const income = sum(mine.filter((e) => isIncome(e.category)));
  const costs = sum(mine.filter((e) => !isIncome(e.category) && e.category !== "partner_fee"));
  const fees = rules.map((r) => {
    const due = r.mode === "fixed" ? r.value : round((income * r.value) / 100);
    const recorded = sum(mine.filter((e) => e.category === "partner_fee" && e.owner_id === r.partner_id));
    return { ...r, due, recorded, outstanding: round(due - recorded) };
  });
  // Fees recorded for a partner without a rule still count.
  const ruled = new Set(rules.map((r) => r.partner_id));
  const extra = sum(mine.filter((e) => e.category === "partner_fee" && e.owner_id && !ruled.has(e.owner_id)));
  const feesRecorded = round(fees.reduce((a, f) => a + f.recorded, 0) + extra);
  const feesDue = round(fees.reduce((a, f) => a + Math.max(f.due, f.recorded), 0) + extra);
  return {
    income,
    costs,
    fees,
    feesRecorded,
    feesDue,
    /** Kept by the firm so far, from what's recorded. */
    toReserves: round(income - costs - feesRecorded),
    /** Kept by the firm once every fee due is recorded. */
    toReservesAfterFees: round(income - costs - feesDue),
  };
}
