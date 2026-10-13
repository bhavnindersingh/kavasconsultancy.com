import { CATEGORY_LABEL, isIncome, PAYER_ENTITY_LABEL, type AccountCategory, type AccountEntry } from "@/lib/workspace/types";

// ── The books ──────────────────────────────────────────────────────────────
// Kavas Consultancy is a partnership of equal partners with no bank account
// of its own: every bill is paid, and every client payment received, by a
// partner or by Kavas Capital (its partners' own firm). So each entry posts
// in double entry:
//
//   bill paid by a partner      Dr expense head      Cr that partner
//   bill paid by Kavas Capital  Dr expense head      Cr its partners, equally
//   client pays a partner       Dr that partner      Cr fees from clients
//   salary to a firm partner    Dr partners' remuneration (an appropriation
//                               of profit, not an expense)   Cr payer
//   a retired "personal" entry  Dr the partner it was for (drawings)  Cr payer
//
// A partner's current account in CREDIT means the firm owes them; in DEBIT,
// they owe the firm. Profit after remuneration is shared equally and
// credited to each partner. Entries with no payer post to a suspense account
// so the books still balance, and are flagged.
//
// Amounts are as entered (GST-inclusive); everything is in one currency.

export type Group = "income" | "expense" | "appropriation" | "partner" | "other";

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
export const SUSPENSE = "other:suspense";
const CAPITAL_UNSPLIT = "other:kavas_capital";

const nameOf = (p: Person) => p.full_name || p.email;
const round = (v: number) => Math.round(v * 100) / 100;

/** Split `amount` into `n` parts that add back exactly (paise go to the first). */
function split(amount: number, n: number) {
  const base = Math.floor((amount / n) * 100) / 100;
  const parts = Array.from({ length: n }, () => base);
  parts[0] = round(amount - base * (n - 1));
  return parts;
}

export function buildBooks(
  entries: AccountEntry[],
  opts: { from: string; to: string; partners: Person[]; capitalPartners: Person[]; nameOfId: (id: string | null) => string },
) {
  const { from, partners, capitalPartners, nameOfId } = opts;
  const accounts = new Map<string, Account>();
  const add = (key: string, name: string, group: Group) => {
    if (!accounts.has(key)) accounts.set(key, { key, name, group });
    return key;
  };
  const partnerKey = (id: string) => add(`partner:${id}`, `${partners.find((p) => p.id === id) ? nameOf(partners.find((p) => p.id === id)!) : nameOfId(id)} — current account`, "partner");
  partners.forEach((p) => partnerKey(p.id));
  add(FEES, "Fees from clients", "income");
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
    const base = [e.description, e.party].filter(Boolean).join(" — ");
    const post = (account: string, dr: number, cr: number, narration = base) =>
      postings.push({ date: e.entry_date, entryId: e.id, account, dr: round(dr), cr: round(cr), narration });
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
  /** Profit to share: income less expenses less partners' remuneration. */
  const divisible = (list: Posting[]) =>
    round(-list.filter((p) => ["income", "expense", "appropriation"].includes(groupOf(p.account))).reduce((a, p) => a + p.dr - p.cr, 0));
  const shares = (profit: number) => {
    const parts = partners.length ? split(profit, partners.length) : [];
    return new Map(partners.map((p, i) => [`partner:${p.id}`, parts[i]]));
  };

  // Opening balances: balance-sheet accounts carry forward, with every
  // earlier period's profit already shared out. Income and expenses start at nil.
  const priorShare = shares(divisible(before));
  const opening = new Map<string, number>();
  for (const a of accounts.values()) {
    if (a.group === "partner" || a.group === "other") opening.set(a.key, round(net(before, a.key) - (priorShare.get(a.key) ?? 0)));
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
  const remuneration = net(during, REMUNERATION);
  const remunerationBy = new Map<string, number>();
  for (const e of entries) {
    if (e.category === "salary" && e.owner_id && firmIds.has(e.owner_id) && (!from || e.entry_date >= from))
      remunerationBy.set(e.owner_id, round((remunerationBy.get(e.owner_id) ?? 0) + Number(e.amount)));
  }
  const toShare = round(netProfit - remuneration);
  const share = shares(toShare);

  // Trial balance: opening balance-sheet balances, plus the period's
  // postings, before the profit is shared out.
  const trial = [...accounts.values()]
    .map((a) => {
      const bal = round((opening.get(a.key) ?? 0) + net(during, a.key));
      return { account: a, dr: bal > 0 ? bal : 0, cr: bal < 0 ? -bal : 0 };
    })
    .filter((r) => r.dr || r.cr || r.account.group === "partner");
  const trialDr = round(trial.reduce((a, r) => a + r.dr, 0));
  const trialCr = round(trial.reduce((a, r) => a + r.cr, 0));

  // Balance sheet: after the period's profit is shared.
  const closing = [...accounts.values()]
    .filter((a) => a.group === "partner" || a.group === "other")
    .map((a) => {
      const bal = round((opening.get(a.key) ?? 0) + net(during, a.key) - (share.get(a.key) ?? 0));
      return { account: a, opening: opening.get(a.key) ?? 0, movement: net(during, a.key), share: share.get(a.key) ?? 0, balance: bal };
    });

  // Ledgers: each account's postings in the period with a running balance.
  const ledger = (key: string) => {
    let run = opening.get(key) ?? 0;
    const rows = during
      .filter((p) => p.account === key)
      .map((p) => {
        run = round(run + p.dr - p.cr);
        return { ...p, balance: run };
      });
    const s = share.get(key);
    if (s) {
      run = round(run - s);
      rows.push({ date: opts.to || rows.at(-1)?.date || "", entryId: "", account: key, dr: s < 0 ? -s : 0, cr: s > 0 ? s : 0, narration: `Share of ${s > 0 ? "profit" : "loss"} for the period`, balance: run });
    }
    return { opening: opening.get(key) ?? 0, rows, closing: run };
  };

  const unrecorded = entries.filter((e) => !e.paid_by_id && !e.paid_by_entity && (!from || e.entry_date >= from)).length;

  return {
    accounts: [...accounts.values()],
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netProfit,
    remuneration,
    remunerationBy,
    toShare,
    share,
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
