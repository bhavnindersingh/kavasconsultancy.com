"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import type { AccountEntry, Project } from "@/lib/workspace/types";
import Modal from "../Modal";
import { useWorkspace } from "../WorkspaceContext";
import { projectSummary } from "./books";
import { money } from "./ledger";

const inr = (v: number) => money(v, "INR");

/**
 * Project-wise P&L, all time: what each client paid, what the project cost,
 * the partners' fees due under its rules and recorded so far, and what it
 * leaves for the firm's Cash reserves.
 */
export default function ProjectsView({
  projects,
  onChanged,
  onRecordFee,
}: {
  projects: Project[];
  onChanged: () => void;
  /** Opens a new partner-fee entry for this project and partner, at this amount. */
  onRecordFee: (projectId: string, partnerId: string, amount: number) => void;
}) {
  const { nameOf } = useWorkspace();
  const supabase = supabaseBrowser();
  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("account_entries")
      .select("id, category, amount, currency, owner_id, project_id")
      .not("project_id", "is", null)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) return setError(error.message);
        setEntries((data ?? []) as AccountEntry[]);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, projects]);

  const rows = useMemo(
    () =>
      projects
        .filter((p) => showClosed || p.is_active)
        .map((p) => ({
          p,
          s: projectSummary(
            entries,
            p.id,
            (p.project_partner_fees ?? []).map((r) => ({ partner_id: r.partner_id, mode: r.mode, value: Number(r.value) })),
          ),
        })),
    [projects, entries, showClosed],
  );
  const closed = projects.filter((p) => !p.is_active).length;
  const total = rows.reduce(
    (a, { s }) => ({ income: a.income + s.income, costs: a.costs + s.costs, fees: a.fees + s.feesRecorded, kept: a.kept + s.toReserves }),
    { income: 0, costs: 0, fees: 0, kept: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mute">
          Each project’s numbers, all time. Partners’ fees come out first; what’s left is kept in the firm’s Cash reserves.
        </p>
        <div className="flex items-center gap-3">
          {closed > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show {closed} closed
            </label>
          )}
          <button className="ws-btn ws-btn--primary" onClick={() => setEditing("new")}>New project</button>
        </div>
      </div>
      {error && <p className="rounded-lg bg-[#fef3f2] px-3 py-2 text-sm text-[#b42318]">{error}</p>}

      {!rows.length ? (
        <div className="rounded-2xl border border-dashed border-ghost p-10 text-center">
          <p className="mb-2 font-serif text-2xl">No projects yet</p>
          <p className="mx-auto mb-4 max-w-md text-body">
            Add a project with each partner’s fee — fixed, or a % of what the client pays. Then tag its invoices and bills with it.
          </p>
          <button className="ws-btn ws-btn--primary" onClick={() => setEditing("new")}>New project</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-mute">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 font-normal">Project</th>
                <th className="px-4 py-2.5 text-right font-normal">Client paid</th>
                <th className="px-4 py-2.5 text-right font-normal">Costs</th>
                <th className="px-4 py-2.5 font-normal">Partners’ fees</th>
                <th className="px-4 py-2.5 text-right font-normal">Kept in reserves</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, s }) => (
                <tr key={p.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium">{p.name}</span>
                    {!p.is_active && <span className="ws-chip ml-2 bg-cream text-[11px]">Closed</span>}
                    {p.client && <span className="block text-xs text-mute">{p.client}</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#067647]">{inr(s.income)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inr(s.costs)}</td>
                  <td className="px-4 py-3">
                    {s.fees.length === 0 && s.feesRecorded === 0 && <span className="text-mute">No fee rules</span>}
                    {s.fees.map((f) => (
                      <div key={f.partner_id} className="flex flex-wrap items-baseline gap-x-2">
                        <span>{nameOf(f.partner_id).split(" ")[0]}</span>
                        <span className="text-xs text-mute">{f.mode === "fixed" ? "fixed" : `${f.value}%`}</span>
                        <span className="tabular-nums">
                          {inr(f.recorded)} <span className="text-mute">of {inr(f.due)}</span>
                        </span>
                        {f.outstanding > 0.005 && (
                          <button className="text-xs underline underline-offset-2" onClick={() => onRecordFee(p.id, f.partner_id, f.outstanding)}>
                            Record {inr(f.outstanding)}
                          </button>
                        )}
                      </div>
                    ))}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium tabular-nums ${s.toReserves < 0 ? "text-[#b42318]" : ""}`}>
                    {inr(s.toReserves)}
                    {Math.abs(s.toReservesAfterFees - s.toReserves) > 0.005 && (
                      <span className="block text-xs font-normal text-mute">{inr(s.toReservesAfterFees)} once fees are recorded</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="ws-btn" onClick={() => setEditing(p)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 1 && (
              <tfoot>
                <tr className="border-t border-line font-medium">
                  <td className="px-4 py-2.5">All projects shown</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[#067647]">{inr(total.income)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{inr(total.costs)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{inr(total.fees)} recorded</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{inr(total.kept)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {editing && (
        <ProjectDialog
          project={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

type Rule = { mode: "none" | "fixed" | "percent"; value: string };

function ProjectDialog({ project, onClose, onSaved }: { project: Project | null; onClose: () => void; onSaved: () => void }) {
  const { people } = useWorkspace();
  const supabase = supabaseBrowser();
  const partners = people.filter((p) => p.is_firm_partner);
  const [name, setName] = useState(project?.name ?? "");
  const [client, setClient] = useState(project?.client ?? "");
  const [notes, setNotes] = useState(project?.notes ?? "");
  const [active, setActive] = useState(project?.is_active ?? true);
  const [rules, setRules] = useState<Record<string, Rule>>(() =>
    Object.fromEntries(
      partners.map((p) => {
        const r = project?.project_partner_fees?.find((x) => x.partner_id === p.id);
        return [p.id, r ? { mode: r.mode, value: String(Number(r.value)) } : { mode: "none", value: "" }];
      }),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    for (const p of partners) {
      const r = rules[p.id];
      if (r.mode === "none") continue;
      const v = Number(r.value);
      if (!r.value || Number.isNaN(v) || v < 0) return setError(`Enter ${p.full_name || p.email}’s fee.`);
      if (r.mode === "percent" && v > 100) return setError("A percentage fee can’t be over 100%.");
    }
    setSaving(true);
    const row = { name: name.trim(), client: client.trim() || null, notes: notes.trim() || null, is_active: active };
    const { data, error } = project
      ? await supabase.from("projects").update(row).eq("id", project.id).select("id").single()
      : await supabase.from("projects").insert(row).select("id").single();
    if (error) {
      setSaving(false);
      return setError(error.code === "23505" ? "There’s already a project with that name." : error.message);
    }
    // Replace the fee rules with what's on screen.
    const keep = partners.filter((p) => rules[p.id].mode !== "none");
    const drop = partners.filter((p) => rules[p.id].mode === "none").map((p) => p.id);
    if (drop.length) {
      const { error: de } = await supabase.from("project_partner_fees").delete().eq("project_id", data.id).in("partner_id", drop);
      if (de) {
        setSaving(false);
        return setError(de.message);
      }
    }
    if (keep.length) {
      const { error: ue } = await supabase.from("project_partner_fees").upsert(
        keep.map((p) => ({ project_id: data.id, partner_id: p.id, mode: rules[p.id].mode, value: Number(rules[p.id].value) })),
        { onConflict: "project_id,partner_id" },
      );
      if (ue) {
        setSaving(false);
        return setError(ue.message);
      }
    }
    onSaved();
  }

  return (
    <Modal title={project ? `Edit ${project.name}` : "New project"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="ws-label" htmlFor="pr-name">Project</label>
            <input id="pr-name" className="ws-input" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. RapidQS website" />
          </div>
          <div>
            <label className="ws-label" htmlFor="pr-client">Client</label>
            <input id="pr-client" className="ws-input" value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
        </div>

        <fieldset>
          <legend className="ws-label">Partners’ fees on this project</legend>
          <p className="mb-2 text-xs text-mute">A fixed amount, or a % of what the client pays. What’s left after costs and fees is kept in Cash reserves.</p>
          <div className="space-y-2">
            {partners.map((p) => {
              const r = rules[p.id];
              const setRule = (next: Partial<Rule>) => setRules((cur) => ({ ...cur, [p.id]: { ...cur[p.id], ...next } }));
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2">
                  <span className="min-w-28 flex-1 text-sm font-medium">{p.full_name || p.email}</span>
                  <div className="inline-flex rounded-full border border-line bg-card p-0.5" role="radiogroup" aria-label={`${p.full_name || p.email}’s fee`}>
                    {(["none", "fixed", "percent"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={r.mode === m}
                        onClick={() => setRule({ mode: m })}
                        className={`rounded-full px-3 py-1 text-sm ${r.mode === m ? "bg-ink text-paper" : ""}`}
                      >
                        {m === "none" ? "No fee" : m === "fixed" ? "Fixed ₹" : "% of fees"}
                      </button>
                    ))}
                  </div>
                  {r.mode !== "none" && (
                    <input
                      className="ws-input !w-32 tabular-nums"
                      type="number"
                      min={0}
                      max={r.mode === "percent" ? 100 : undefined}
                      step="0.01"
                      inputMode="decimal"
                      aria-label={r.mode === "percent" ? "Percent" : "Amount"}
                      placeholder={r.mode === "percent" ? "e.g. 20" : "e.g. 50000"}
                      value={r.value}
                      onChange={(e) => setRule({ value: e.target.value })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label className="ws-label" htmlFor="pr-notes">Notes</label>
          <textarea id="pr-notes" className="ws-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
          <span className="text-mute">— untick when the project is done; it stays in the books</span>
        </label>

        {error && <p className="text-sm text-[#b42318]" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <button type="button" className="ws-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="ws-btn ws-btn--primary" disabled={saving}>{saving ? "Saving…" : "Save project"}</button>
        </div>
      </form>
    </Modal>
  );
}
