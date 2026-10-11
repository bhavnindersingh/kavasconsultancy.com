"use client";

import { useRef, useState } from "react";
import { errorText, formatBytes, objectKey, openObject, removeObjects, uploadObject } from "@/lib/workspace/files";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import {
  ACCOUNT_CATEGORIES,
  CATEGORY_LABEL,
  CURRENCIES,
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
import { today } from "../tasks/bits";
import { splitGst } from "./ledger";

const ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.pdf";
const ACCEPT_EXT = ACCEPT.split(",").map((e) => e.slice(1));
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Draft = Record<string, string | boolean>;

const str = (v: unknown) => (v == null ? "" : String(v));

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
  onSaved: () => void;
}) {
  const supabase = supabaseBrowser();
  const [d, setD] = useState<Draft>(() => toDraft(entry, defaults));
  const [files, setFiles] = useState<AccountFile[]>(entry?.account_files ?? []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showTransfer, setShowTransfer] = useState(Boolean(entry?.paid_from || entry?.reference_no || entry?.payee_account || entry?.bank_narration));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // Set once the row exists, so a retry after a failed receipt upload updates
  // the entry instead of inserting it twice.
  const savedId = useRef<string | null>(entry?.id ?? null);

  const set = (k: string, v: string | boolean) => setD((cur) => ({ ...cur, [k]: v }));
  const category = d.category as AccountCategory;
  const perPerson = PER_PERSON.includes(category);

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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (perPerson && !d.owner_id) return setError(`${category === "salary" ? "A salary" : "A personal expense"} belongs to one partner — pick whose.`);
    const gstin = str(d.vendor_gstin).trim().toUpperCase();
    if (d.gst_applicable && gstin && !GSTIN_PATTERN.test(gstin)) return setError("That GSTIN doesn't look right (15 characters, e.g. 27AAPFU0939F1ZV).");

    const blank = (k: string) => (str(d[k]).trim() === "" ? null : str(d[k]).trim());
    const num = (k: string) => (str(d[k]).trim() === "" ? null : Number(d[k]));
    const row = {
      entry_date: d.entry_date,
      category,
      owner_id: d.owner_id || null,
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {field("entry_date", "Date", { type: "date", required: true })}
          <div>
            <label className="ws-label" htmlFor="e-category">Category</label>
            <select id="e-category" className="ws-input" value={category} onChange={(e) => set("category", e.target.value)}>
              {ACCOUNT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="ws-label" htmlFor="e-owner">Whose</label>
            <select id="e-owner" className="ws-input" value={str(d.owner_id)} onChange={(e) => set("owner_id", e.target.value)}>
              {!perPerson && <option value="">Joint</option>}
              {perPerson && <option value="">Pick a partner</option>}
              {partners.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
          </div>
          {category === "salary" && field("salary_month", "For month", { type: "month" })}
          <div className="col-span-2">{field("description", "Description", { required: true, placeholder: "What it was for" })}</div>
          {field("party", category === "salary" ? "Paid to" : "Vendor / party")}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            {field("amount", "Amount", { type: "number", min: 0, step: "0.01", required: true, inputMode: "decimal" })}
            <div>
              <label className="ws-label" htmlFor="e-currency">&nbsp;</label>
              <select id="e-currency" className="ws-input" value={str(d.currency)} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="ws-label" htmlFor="e-method">Payment method</label>
            <select id="e-method" className="ws-input" value={str(d.payment_method)} onChange={(e) => set("payment_method", e.target.value)}>
              <option value="">—</option>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <fieldset className="rounded-xl border border-line p-3">
          <button type="button" className="text-sm font-medium" onClick={() => setShowTransfer((s) => !s)} aria-expanded={showTransfer}>
            {showTransfer ? "▾" : "▸"} Transfer details <span className="text-mute font-normal">— what the bank statement shows</span>
          </button>
          {showTransfer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {field("paid_from", "Paid from", { placeholder: "e.g. HDFC current a/c" })}
              {field("reference_no", "Reference / UTR")}
              {field("payee_account", "Payee account / UPI ID")}
              {field("bank_narration", "Bank narration")}
            </div>
          )}
        </fieldset>

        <fieldset className="rounded-xl border border-line p-3">
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

        <section>
          <h3 className="text-sm font-medium mb-2">Receipts</h3>
          <ul className="space-y-1 mb-2 text-sm">
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
          <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files)} />
          <button type="button" className="ws-btn" onClick={() => fileInput.current?.click()}>Add receipt</button>
        </section>

        {error && <p className="text-sm text-[#b42318]" role="alert">{error}</p>}
        <div className="flex items-center justify-between pt-2 border-t border-line">
          {entry ? <ConfirmButton label="Delete entry" confirmLabel="Delete entry and receipts?" onConfirm={removeEntry} /> : <span />}
          <button type="submit" className="ws-btn ws-btn--primary mt-3" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
