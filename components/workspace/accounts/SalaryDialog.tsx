"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import type { AccountEntry, Currency, Profile } from "@/lib/workspace/types";
import Modal from "../Modal";
import { today } from "../tasks/bits";
import { money, monthKey, monthLabel } from "./ledger";

type Last = Pick<AccountEntry, "owner_id" | "amount" | "currency" | "payment_method" | "paid_from" | "payee_account" | "party">;
type Paid = Pick<AccountEntry, "id" | "owner_id" | "amount" | "currency" | "entry_date">;

/**
 * Pay salaries: for a month, each partner's last salary (pre-filled) and what
 * is already recorded for that month, so a salary is never entered twice.
 */
export default function SalaryDialog({ partners, onClose, onSaved }: { partners: Profile[]; onClose: () => void; onSaved: () => void }) {
  const supabase = supabaseBrowser();
  const [month, setMonth] = useState(monthKey(today()));
  const [last, setLast] = useState<Record<string, Last>>({});
  const [paid, setPaid] = useState<Paid[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const ids = partners.map((p) => p.id);
    const [l, p] = await Promise.all([
      supabase
        .from("account_entries")
        .select("owner_id, amount, currency, payment_method, paid_from, payee_account, party, salary_month, entry_date")
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
    setPaid((p.data ?? []) as Paid[]);
    setAmounts(Object.fromEntries(ids.map((id) => [id, byOwner[id] ? String(byOwner[id].amount) : ""])));
  }, [supabase, partners, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch per month
    load();
  }, [load]);

  async function record(p: Profile) {
    const l = last[p.id];
    const amount = Number(amounts[p.id]);
    if (!amount) return setError("Enter an amount first.");
    const { error } = await supabase.from("account_entries").insert({
      entry_date: today(),
      category: "salary",
      owner_id: p.id,
      salary_month: `${month}-01`,
      description: `Salary — ${monthLabel(month)}`,
      party: l?.party ?? (p.full_name || p.email),
      amount,
      currency: (l?.currency ?? "INR") as Currency,
      payment_method: l?.payment_method ?? "Bank transfer",
      paid_from: l?.paid_from ?? null,
      payee_account: l?.payee_account ?? null,
    });
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
        {partners.map((p) => {
          const done = paid.filter((x) => x.owner_id === p.id);
          const l = last[p.id];
          return (
            <div key={p.id} className="rounded-xl border border-line bg-card p-3">
              <div className="flex justify-between gap-2 mb-2">
                <span className="font-medium">{p.full_name || p.email}</span>
                {l && <span className="text-xs text-mute">last {money(Number(l.amount), l.currency)}{l.payment_method && ` · ${l.payment_method}`}</span>}
              </div>
              {done.length > 0 && (
                <p className="text-sm text-body mb-2">
                  Already recorded: {done.map((x) => `${money(Number(x.amount), x.currency)} on ${x.entry_date}`).join(", ")}
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
        {error && <p className="text-sm text-[#b42318]">{error}</p>}
        <p className="text-xs text-mute">Recorded with today’s date and the last salary’s payment details. Edit the entry afterwards to add a reference number.</p>
      </div>
    </Modal>
  );
}
