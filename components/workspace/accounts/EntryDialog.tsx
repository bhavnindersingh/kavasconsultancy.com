"use client";

import { useRef, useState } from "react";
import { errorText, formatBytes, objectKey, openObject, removeObjects, uploadObject } from "@/lib/workspace/files";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import {
  CATEGORY_LABEL,
  CURRENCIES,
  ENTRY_CATEGORIES,
  GST_RATES,
  GSTIN_PATTERN,
  PAYMENT_METHODS,
  PER_PERSON,
  type AccountCategory,
  type AccountEntry,
  type AccountFile,
  type Currency,
  type Profile,
} from "@/lib/workspace/types";
import ConfirmButton from "../ConfirmButton";
import Modal from "../Modal";
import { useWorkspace } from "../WorkspaceContext";
import { today } from "../tasks/bits";
import { splitGst } from "./ledger";

const ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.pdf";
const ACCEPT_EXT = ACCEPT.split(",").map((e) => e.slice(1));
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Draft = Record<string, string | boolean>;

const str = (v: unknown) => (v == null ? "" : String(v));

// The last category and payment method used, so a run of similar entries
// needs fewer taps. Per viewer, and optional: storage may be unavailable.
const LAST_KEY = "ws-accounts-last";
function lastUsed(): Partial<Draft> {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY) ?? "{}");
    return {
      ...(ENTRY_CATEGORIES.includes(v.category) ? { category: v.category } : {}),
      ...(PAYMENT_METHODS.includes(v.payment_method) ? { payment_method: v.payment_method } : {}),
    };
  } catch {
    return {};
  }
}
function remember(d: Draft) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ category: d.category, payment_method: d.payment_method }));
  } catch {}
}

function toDraft(e: AccountEntry | null, defaults?: Partial<Draft>): Draft {
  return {
    entry_date: e?.entry_date ?? today(),
    category: e?.category ?? "company",
    owner_id: e?.owner_id ?? "",
    salary_month: e?.salary_month?.slice(0, 7) ?? "",
    party: str(e?.party),
    description: str(e?.description),
    amount: str(e?.amount),
    currency: e?.currency ?? "INR",
    payment_method: str(e?.payment_method),
    notes: str(e?.notes),
    paid_from: str(e?.paid_from),
    reference_no: str(e?.reference_no),
    payee_account: str(e?.payee_account),
    bank_narration: str(e?.bank_narration),
    gst_applicable: e?.gst_applicable ?? false,
    vendor_gstin: str(e?.vendor_gstin),
    invoice_no: str(e?.invoice_no),
    invoice_date: str(e?.invoice_date),
    gst_rate: str(e?.gst_rate),
    taxable_value: str(e?.taxable_value),
    gst_amount: str(e?.gst_amount),
    ...defaults,
  };
}

export default function EntryDialog({
  entry,
  partners,
  defaults,
  onClose,
  onSaved,
}: {
  entry: AccountEntry | null;
  partners: Profile[];
  defaults?: Partial<Draft>;
  onClose: () => void;
  /** `another`: the dialog stays open for the next entry. */
  onSaved: (another?: boolean) => void;
}) {
  const supabase = supabaseBrowser();
  const { people, nameOf } = useWorkspace();
  const [d, setD] = useState<Draft>(() => toDraft(entry, entry ? defaults : { ...lastUsed(), ...defaults }));
  const [files, setFiles] = useState<AccountFile[]>(entry?.account_files ?? []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  // The everyday fields are always shown; the rest opens on demand, or by
  // itself when an entry being edited already has any of it.
  const [more, setMore] = useState(
    Boolean(entry && ((PER_PERSON.includes(entry.category) && entry.party) || entry.notes || entry.gst_applicable || entry.paid_from || entry.reference_no || entry.payee_account || entry.bank_narration || entry.currency !== "INR")),
  );
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  // Set once the row exists, so a retry after a failed receipt upload updates
  // the entry instead of inserting it twice.
  const savedId = useRef<string | null>(entry?.id ?? null);

  const set = (k: string, v: string | boolean) => setD((cur) => ({ ...cur, [k]: v }));
  const category = d.category as AccountCategory;
  const perPerson = PER_PERSON.includes(category);
  // Every expense is the consultancy's; only a salary names a person (anyone
  // on the team). A retired "personal" entry keeps its partner.
  const owners = category === "salary" ? people : partners;
  const ownerId = str(d.owner_id);
  const ownerGone = ownerId && !owners.some((p) => p.id === ownerId);

  function fillGst() {
    const amount = Number(d.amount);
    const rate = Number(d.gst_rate);
    if (!amount || Number.isNaN(rate)) return;
    const { taxable, gst } = splitGst(amount, rate);
    setD((cur) => ({ ...cur, taxable_value: String(taxable), gst_amount: String(gst) }));
  }

  function pick(list: FileList | null) {
    if (!list) return;
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ACCEPT_EXT.includes(ext)) return setError(`${f.name}: receipts must be an image or a PDF`);
      if (f.size > MAX_FILE_BYTES) return setError(`${f.name} is over 10 MB`);
      ok.push(f);
    }
    setPendingFiles((cur) => [...cur, ...ok]);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const another = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "another";
    setError(null);
    setSavedNote(null);
    if (perPerson && !d.owner_id) return setError(category === "salary" ? "Pick who the salary is for." : "A personal expense belongs to one partner — pick whose.");
    const gstin = str(d.vendor_gstin).trim().toUpperCase();
    if (d.gst_applicable && gstin && !GSTIN_PATTERN.test(gstin)) return setError("That GSTIN doesn't look right (15 characters, e.g. 27AAPFU0939F1ZV).");

    const blank = (k: string) => (str(d[k]).trim() === "" ? null : str(d[k]).trim());
    const num = (k: string) => (str(d[k]).trim() === "" ? null : Number(d[k]));
    const row = {
      entry_date: d.entry_date,
      category,
      owner_id: perPerson ? d.owner_id || null : null,
      salary_month: category === "salary" && d.salary_month ? `${d.salary_month}-01` : null,
      party: blank("party"),
      description: str(d.description).trim(),
      amount: Number(d.amount),
      currency: d.currency as Currency,
      payment_method: blank("payment_method"),
      notes: blank("notes"),
      paid_from: blank("paid_from"),
      reference_no: blank("reference_no"),
      payee_account: blank("payee_account"),
      bank_narration: blank("bank_narration"),
      gst_applicable: Boolean(d.gst_applicable),
      vendor_gstin: d.gst_applicable ? gstin || null : null,
      invoice_no: d.gst_applicable ? blank("invoice_no") : null,
      invoice_date: d.gst_applicable ? blank("invoice_date") : null,
      gst_rate: d.gst_applicable ? num("gst_rate") : null,
      taxable_value: d.gst_applicable ? num("taxable_value") : null,
      gst_amount: d.gst_applicable ? num("gst_amount") : null,
    };

    setSaving(true);
    try {
      const { data, error } = savedId.current
        ? await supabase.from("account_entries").update(row).eq("id", savedId.current).select("id").single()
        : await supabase.from("account_entries").insert(row).select("id").single();
      if (error) throw error;
      savedId.current = data.id;
      for (const file of pendingFiles) {
        const key = objectKey(data.id, file);
        await uploadObject("account-files", key, file);
        const { error: fe } = await supabase
          .from("account_files")
          .insert({ entry_id: data.id, name: file.name, storage_path: key, mime_type: file.type || null, file_size: file.size });
        if (fe) {
          await removeObjects("account-files", [key]);
          throw fe;
        }
        setPendingFiles((cur) => cur.filter((f) => f !== file));
      }
      if (!entry) remember(d);
      if (another) {
        // Keep the date, category, whose and method; clear what's specific.
        setSavedNote(`Saved “${row.description}”. Next one:`);
        setD((cur) => ({ ...toDraft(null), entry_date: cur.entry_date, category: cur.category, owner_id: cur.owner_id, payment_method: cur.payment_method, currency: cur.currency }));
        setFiles([]);
        savedId.current = null;
        setSaving(false);
        onSaved(true);
        amountRef.current?.focus();
        return;
      }
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  async function removeFile(f: AccountFile) {
    const { error } = await supabase.from("account_files").delete().eq("id", f.id);
    if (error) return setError(error.message);
    await removeObjects("account-files", [f.storage_path]);
    setFiles((cur) => cur.filter((x) => x.id !== f.id));
  }

  async function removeEntry() {
    if (!entry) return;
    const { error } = await supabase.from("account_entries").delete().eq("id", entry.id);
    if (error) return setError(error.message);
    await removeObjects("account-files", files.map((f) => f.storage_path));
    onSaved();
  }

  const field = (k: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="ws-label" htmlFor={`e-${k}`}>{label}</label>
      <input id={`e-${k}`} className="ws-input" value={str(d[k])} onChange={(e) => set(k, e.target.value)} {...props} />
    </div>
  );

  return (
    <Modal title={entry ? "Edit entry" : "New entry"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-5">
        {savedNote && <p className="rounded-lg bg-[#ecfdf3] px-3 py-2 text-sm text-[#067647]" role="status">{savedNote}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <div>
            <label className="ws-label" htmlFor="e-amount">Amount</label>
            <div className="flex">
              <select
                aria-label="Currency"
                className="ws-input !w-auto rounded-r-none border-r-0"
                value={str(d.currency)}
                onChange={(e) => set("currency", e.target.value)}
              >
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input
                ref={amountRef}
                id="e-amount"
                className="ws-input rounded-l-none text-lg tabular-nums"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                required
                autoFocus={!entry}
                placeholder="0"
                value={str(d.amount)}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>
          </div>
          {field("description", "What was it for?", { required: true, placeholder: category === "salary" ? "e.g. Salary — October" : "e.g. Office internet, October" })}
        </div>

        <Choice
          label="Category"
          value={category}
          options={[...ENTRY_CATEGORIES, ...(entry && !ENTRY_CATEGORIES.includes(entry.category) ? [entry.category] : [])].map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
          onChange={(v) =>
            setD((cur) => {
              // Keep whose only if they still fit: anyone for a salary, a partner otherwise.
              const fits = PER_PERSON.includes(v as AccountCategory) && (v === "salary" ? people : partners).some((p) => p.id === cur.owner_id);
              return { ...cur, category: v, owner_id: fits ? cur.owner_id : "" };
            })
          }
        />

        {!perPerson && field("party", "Paid to", { placeholder: "Vendor, shop or service", autoComplete: "off" })}
        {perPerson && (
          <Choice
            label={category === "salary" ? "Paid to" : "Whose"}
            value={ownerId}
            options={[
              ...owners.map((p) => ({ value: p.id, label: p.full_name || p.email })),
              // Editing an entry whose person has since left: keep them selectable.
              ...(ownerGone ? [{ value: ownerId, label: `${nameOf(ownerId)} (no longer here)` }] : []),
            ]}
            onChange={(v) => set("owner_id", v)}
          />
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
          {field("entry_date", "Date paid", { type: "date", required: true })}
          <Choice
            label="Paid by"
            value={str(d.payment_method)}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
            onChange={(v) => set("payment_method", d.payment_method === v ? "" : v)}
          />
        </div>

        <section>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files)} />
            <button type="button" className="ws-btn" onClick={() => fileInput.current?.click()}>Attach receipt</button>
            <span className="text-xs text-mute">Image or PDF, up to 10 MB</span>
          </div>
          {(files.length > 0 || pendingFiles.length > 0) && (
            <ul className="mt-2 space-y-1 text-sm">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-2">
                  <button type="button" className="flex-1 truncate text-left underline underline-offset-2" onClick={() => openObject("account-files", f.storage_path).catch((e) => setError(errorText(e)))}>
                    {f.name}
                  </button>
                  <span className="text-xs text-mute">{formatBytes(f.file_size)}</span>
                  <button type="button" className="text-mute" onClick={() => removeFile(f)} aria-label={`Remove ${f.name}`}>✕</button>
                </li>
              ))}
              {pendingFiles.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-body">
                  <span className="flex-1 truncate">{f.name} <span className="text-mute">(uploads on save)</span></span>
                  <button type="button" className="text-mute" onClick={() => setPendingFiles((cur) => cur.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="rounded-xl border border-line">
          <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium" onClick={() => setMore((m) => !m)} aria-expanded={more}>
            <span className="text-mute">{more ? "▾" : "▸"}</span> More details
            <span className="font-normal text-mute">— bank transfer, GST invoice, notes</span>
          </button>
          {more && (
            <div className="space-y-5 border-t border-line p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {perPerson && field("party", "Name on the transfer")}
                {category === "salary" && field("salary_month", "Salary for month", { type: "month" })}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Bank transfer <span className="font-normal text-mute">— what the statement shows</span></p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {field("paid_from", "Paid from", { placeholder: "e.g. HDFC current a/c" })}
                  {field("reference_no", "Reference / UTR")}
                  {field("payee_account", "Payee account / UPI ID")}
                  {field("bank_narration", "Bank narration")}
                </div>
              </div>

              <fieldset>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={Boolean(d.gst_applicable)} onChange={(e) => set("gst_applicable", e.target.checked)} />
                  GST invoice
                </label>
                {d.gst_applicable && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                    {field("vendor_gstin", "Vendor GSTIN", { maxLength: 15, className: "ws-input uppercase" })}
                    {field("invoice_no", "Invoice no.")}
                    {field("invoice_date", "Invoice date", { type: "date" })}
                    <div>
                      <label className="ws-label" htmlFor="e-gst_rate">GST rate %</label>
                      <select id="e-gst_rate" className="ws-input" value={str(d.gst_rate)} onChange={(e) => set("gst_rate", e.target.value)}>
                        <option value="">—</option>
                        {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </div>
                    {field("taxable_value", "Taxable value", { type: "number", min: 0, step: "0.01" })}
                    {field("gst_amount", "GST amount", { type: "number", min: 0, step: "0.01" })}
                    <div className="col-span-full">
                      <button type="button" className="text-sm underline underline-offset-2 text-body" onClick={fillGst} disabled={!d.amount || d.gst_rate === ""}>
                        Work out taxable value and GST from the amount
                      </button>
                    </div>
                  </div>
                )}
              </fieldset>

              <div>
                <label className="ws-label" htmlFor="e-notes">Notes</label>
                <textarea id="e-notes" className="ws-input" rows={2} value={str(d.notes)} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-[#b42318]" role="alert">{error}</p>}
        <div className="flex items-center justify-between pt-2 border-t border-line">
          {entry ? <ConfirmButton label="Delete entry" confirmLabel="Delete entry and receipts?" onConfirm={removeEntry} /> : <span />}
          <div className="mt-3 flex gap-2">
            {!entry && (
              <button type="submit" name="then" value="another" className="ws-btn" disabled={saving}>
                Save and add another
              </button>
            )}
            <button type="submit" className="ws-btn ws-btn--primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** A row of tap-to-pick buttons: quicker than a dropdown for a handful of options. */
function Choice({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label}>
      <span className="ws-label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value || "none"}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ghost"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
