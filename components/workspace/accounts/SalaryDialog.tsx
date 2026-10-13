"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import { OFFERED_PAYER_ENTITIES, PAYER_ENTITY_LABEL, type AccountEntry, type Currency, type Profile } from "@/lib/workspace/types";
import Modal from "../Modal";
import { today } from "../tasks/bits";
import { entityKey, money, monthKey, monthLabel, payerColumns, payerKey } from "./ledger";

type Last = Pick<AccountEntry, "owner_id" | "amount" | "currency" | "payment_method" | "paid_from" | "payee_account" | "party" | "paid_by_id" | "paid_by_entity">;
type Paid = Pick<AccountEntry, "id" | "owner_id" | "amount" | "currency" | "entry_date">;

/**
 * Pay salaries: for a month, everyone on the team — partners and members —
 * with their last salary pre-filled and what is already recorded for that
 * month, so a salary is never entered twice. "Record all" pays everyone who
 * has an amount and isn't paid yet.
 */
export default function SalaryDialog({ people, onClose, onSaved }: { people: Profile[]; onClose: () => void; onSaved: () => void }) {
  const supabase = supabaseBrowser();
  const [month, setMonth] = useState(monthKey(today()));
  const [last, setLast] = useState<Record<string, Last>>({});
  const [paid, setPaid] = useState<Paid[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  // Who's paying this month's salaries; starts from whoever paid the last one.
  const [payer, setPayer] = useState("");
  const payers = [
    ...people.filter((p) => p.role === "partner").map((p) => ({ value: p.id, label: p.full_name || p.email })),
    ...OFFERED_PAYER_ENTITIES.map((k) => ({ value: entityKey(k), label: PAYER_ENTITY_LABEL[k] })),
  ];
  // Partners first, then members, each by name.
  const team = [...people].sort((a, b) => (a.role === b.role ? 0 : a.role === "partner" ? -1 : 1));

  const load = useCallback(async () => {
    const ids = people.map((p) => p.id);
    const [l, p] = await Promise.all([
      supabase
        .from("account_entries")
        .select("owner_id, amount, currency, payment_method, paid_from, payee_account, party, paid_by_id, paid_by_entity, salary_month, entry_date")
        .eq("category", "salary")
        .in("owner_id", ids)
        .order("salary_month", { ascending: false })
        .order("entry_date", { ascending: false })
        .limit(50),
      supabase
        .from("account_entries")
        .select("id, owner_id, amount, currency, entry_date")
        .eq("category", "salary")
        .eq("salary_month", `${month}-01`)
        .in("owner_id", ids),
    ]);
    if (l.error || p.error) return setError((l.error ?? p.error)!.message);
    const byOwner: Record<string, Last> = {};
    for (const r of (l.data ?? []) as Last[]) if (r.owner_id && !byOwner[r.owner_id]) byOwner[r.owner_id] = r;
    setLast(byOwner);
    const latest = (l.data ?? [])[0] as Last | undefined;
    if (latest) setPayer((cur) => cur || payerKey(latest));
    setPaid((p.data ?? []) as Paid[]);
    setAmounts(Object.fromEntries(ids.map((id) => [id, byOwner[id] ? String(byOwner[id].amount) : ""])));
  }, [supabase, people, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch per month
    load();
  }, [load]);

  const rowFor = (p: Profile) => {
    const l = last[p.id];
    return {
      entry_date: today(),
      category: "salary",
      owner_id: p.id,
      salary_month: `${month}-01`,
      description: `Salary — ${monthLabel(month)}`,
      party: l?.party ?? (p.full_name || p.email),
      currency: (l?.currency ?? "INR") as Currency,
      payment_method: l?.payment_method ?? "Bank transfer",
      paid_from: l?.paid_from ?? null,
      payee_account: l?.payee_account ?? null,
      ...payerColumns(payer),
    };
  };

  async function record(p: Profile) {
    if (!payer) return setError("Pick who is paying the salaries.");
    if (!Number(amounts[p.id])) return setError(`Enter ${p.full_name || p.email}’s amount first.`);
    setError(null);
    const { error } = await supabase.from("account_entries").insert({ ...rowFor(p), amount: Number(amounts[p.id]) });
    if (error) return setError(error.message);
    setSaved(true);
    load();
  }

  const unpaid = team.filter((p) => Number(amounts[p.id]) > 0 && !paid.some((x) => x.owner_id === p.id));
  async function recordAll() {
    if (!unpaid.length) return;
    if (!payer) return setError("Pick who is paying the salaries.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("account_entries").insert(unpaid.map((p) => ({ ...rowFor(p), amount: Number(amounts[p.id]) })));
    setBusy(false);
    if (error) return setError(error.message);
    setSaved(true);
    load();
  }

  return (
    <Modal title="Pay salaries" onClose={saved ? onSaved : onClose}>
      <div className="space-y-4">
        <div>
          <label className="ws-label" htmlFor="s-month">Salary for</label>
          <input id="s-month" type="month" className="ws-input" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div>
          <label className="ws-label" htmlFor="s-payer">Paid by</label>
          <select id="s-payer" className="ws-input" value={payer} onChange={(e) => setPayer(e.target.value)}>
            <option value="">Pick who is paying…</option>
            {payers.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {team.map((p) => {
          const done = paid.filter((x) => x.owner_id === p.id);
          const l = last[p.id];
          return (
            <div key={p.id} className={`rounded-xl border p-3 ${done.length ? "border-[#abefc6] bg-[#f6fef9]" : "border-line bg-card"}`}>
              <div className="flex justify-between gap-2 mb-2">
                <span className="font-medium">
                  {p.full_name || p.email} <span className="text-xs font-normal text-mute capitalize">{p.role}</span>
                </span>
                {l && <span className="text-xs text-mute">last {money(Number(l.amount), l.currency)}{l.payment_method && ` · ${l.payment_method}`}</span>}
              </div>
              {done.length > 0 && (
                <p className="text-sm text-[#067647] mb-2">
                  ✓ Paid: {done.map((x) => `${money(Number(x.amount), x.currency)} on ${x.entry_date}`).join(", ")}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  className="ws-input"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  aria-label={`Salary amount for ${p.full_name || p.email}`}
                  value={amounts[p.id] ?? ""}
                  onChange={(e) => setAmounts((a) => ({ ...a, [p.id]: e.target.value }))}
                />
                <button className="ws-btn ws-btn--primary" onClick={() => record(p)}>
                  {done.length ? "Record another" : "Record"}
                </button>
              </div>
            </div>
          );
        })}
        {error && <p className="text-sm text-[#b42318]" role="alert">{error}</p>}
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="text-sm text-mute">
            {unpaid.length ? `${unpaid.length} of ${team.length} still to pay for ${monthLabel(month)}` : `Everyone with an amount is paid for ${monthLabel(month)}`}
          </span>
          <button className="ws-btn ws-btn--primary" disabled={busy || !unpaid.length} onClick={recordAll}>
            {busy ? "Recording…" : `Record all${unpaid.length ? ` (${unpaid.length})` : ""}`}
          </button>
        </div>
        <p className="text-xs text-mute">Recorded with today’s date and the last salary’s payment details. Edit the entry afterwards to add a reference number.</p>
      </div>
    </Modal>
  );
}
