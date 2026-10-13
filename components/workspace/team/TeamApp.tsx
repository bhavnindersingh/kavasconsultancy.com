"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addMember, sendAccessEmail, setMemberPassword, updateMember, type ActionResult } from "@/app/(workspace)/workspace/(app)/team/actions";
import { MIN_PASSWORD, type Profile, type Role } from "@/lib/workspace/types";
import Modal from "../Modal";
import { useWorkspace } from "../WorkspaceContext";
import { Disc } from "../tasks/bits";
import TwoTap from "../tasks/TwoTap";

export type TeamMember = Profile & { created_at?: string; last_sign_in_at: string | null; invite_pending: boolean };

export default function TeamApp({ members, adminReady }: { members: TeamMember[]; adminReady: boolean }) {
  const { me } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [passwordFor, setPasswordFor] = useState<TeamMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run<R extends ActionResult>(action: () => Promise<R>, done?: string | ((r: R) => string)) {
    setError(null);
    setNotice(null);
    start(async () => {
      const r = await action();
      if (!r.ok) setError(r.error);
      else if (done) setNotice(typeof done === "string" ? done : done(r));
    });
  }

  const emailAccess = (m: TeamMember) =>
    run(
      () => sendAccessEmail(m.id),
      (r) =>
        r.ok && r.sent === "invite"
          ? `Invite sent again to ${m.email}.`
          : `Sent ${m.email} a link to choose a new password. It works for an hour.`,
    );

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? members.filter((m) => `${m.full_name ?? ""} ${m.email}`.toLowerCase().includes(q)) : members;
  const stake = (m: TeamMember, change: { is_firm_partner?: boolean; in_kavas_capital?: boolean }) =>
    run(
      () => updateMember(m.id, change),
      change.is_firm_partner !== undefined
        ? change.is_firm_partner
          ? `${label(m)} is marked as a partner in the firm. They can now be recorded as paying for it.`
          : `${label(m)} is no longer marked as a partner in the firm.`
        : change.in_kavas_capital
          ? `${label(m)} is marked as a Kavas Capital partner.`
          : `${label(m)} is no longer marked as a Kavas Capital partner.`,
    );
  const owners = members.filter((m) => m.is_firm_partner);
  const active = shown.filter((m) => m.is_active);
  const inactive = shown.filter((m) => !m.is_active);
  const everyoneActive = members.filter((m) => m.is_active);
  const partners = everyoneActive.filter((m) => m.role === "partner").length;
  const invited = everyoneActive.filter((m) => m.invite_pending).length;

  return (
    <div className="max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl">Team</h1>
          <p className="text-sm text-mute mt-1">
            {everyoneActive.length} {everyoneActive.length === 1 ? "person" : "people"} · {partners} partner{partners === 1 ? "" : "s"}
            {invited > 0 && ` · ${invited} invite${invited === 1 ? "" : "s"} waiting`}
            {" · "}Members work Tasks. Partners also see Documents, Accounts and this page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {members.length > 6 && (
            <input
              className="ws-input !w-56"
              type="search"
              placeholder="Find a person…"
              aria-label="Find a person"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <button className="ws-btn ws-btn--primary" disabled={!adminReady} onClick={() => setAdding(true)}>
            Add person
          </button>
        </div>
      </header>

      {!adminReady && (
        <p className="mb-4 rounded-lg bg-cream px-3 py-2 text-sm">
          Adding people and setting passwords needs <code>SUPABASE_SECRET_KEY</code> on the server. Roles and
          deactivation still work without it.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-[#fef3f2] text-[#b42318] px-3 py-2 text-sm" role="alert">
          {error} <button className="underline ml-2" onClick={() => setError(null)}>Dismiss</button>
        </p>
      )}
      {notice && <p className="mb-4 rounded-lg bg-[#ecfdf3] text-[#067647] px-3 py-2 text-sm" role="status">{notice}</p>}

      {owners.length === 0 && (
        <p className="mb-4 rounded-lg bg-[#fffaeb] px-3 py-2 text-sm text-[#b54708]">
          The app doesn’t know who owns the firm yet. On each owner, open ⋯ and tick “Partner in the firm”; on Kavas Capital’s owners, also tick
          “Kavas Capital partner”. Accounts uses this to know who can pay bills.
        </p>
      )}
      {q && !shown.length && <p className="mb-4 text-sm text-mute">Nobody matches “{query.trim()}”.</p>}

      {active.length > 0 && (
        <MemberTable
          members={active}
          meId={me.id}
          pending={pending}
          adminReady={adminReady}
          onEdit={setEditing}
          onPassword={setPasswordFor}
          onEmail={emailAccess}
          onRole={(m, role) => run(() => updateMember(m.id, { role }), `${label(m)} is now a ${role}.`)}
          onStake={stake}
          onActive={(m, is_active) => run(() => updateMember(m.id, { is_active }), `${label(m)} has been deactivated.`)}
        />
      )}

      {inactive.length > 0 && (
        <>
          <h2 className="font-serif text-xl mt-10 mb-3">Deactivated</h2>
          <p className="text-sm text-mute mb-3">
            They can’t sign in. Their tasks, comments and ledger entries stay, credited to them.
          </p>
          <MemberTable
            members={inactive}
            meId={me.id}
            pending={pending}
            adminReady={adminReady}
            onEdit={setEditing}
            onPassword={setPasswordFor}
            onEmail={emailAccess}
            onRole={(m, role) => run(() => updateMember(m.id, { role }))}
            onStake={stake}
            onActive={(m, is_active) => run(() => updateMember(m.id, { is_active }), `${label(m)} can sign in again.`)}
          />
        </>
      )}

      {adding && (
        <AddDialog
          onClose={() => setAdding(false)}
          onAdded={(email, invited) => {
            setAdding(false);
            setNotice(
              invited
                ? `Invite sent to ${email}. They’ll choose their own password from the link.`
                : `${email} can sign in now. Send them the password you set, somewhere private.`,
            );
          }}
        />
      )}
      {editing && (
        <NameDialog
          member={editing}
          onClose={() => setEditing(null)}
          onSave={(full_name) => {
            setEditing(null);
            run(() => updateMember(editing.id, { full_name }), `Renamed to ${full_name}.`);
          }}
        />
      )}
      {passwordFor && (
        <PasswordDialog
          member={passwordFor}
          onClose={() => setPasswordFor(null)}
          onDone={() => {
            setNotice(`New password set for ${label(passwordFor)}. Send it to them somewhere private.`);
            setPasswordFor(null);
          }}
        />
      )}
    </div>
  );
}

const label = (m: Profile) => m.full_name || m.email;

/** How recently they were in, as a badge: invite waiting, never, or how long ago. */
function presence(m: TeamMember): { text: string; title?: string; tone: "warn" | "quiet" | "ok" } {
  if (m.invite_pending) return { text: "Invite waiting", tone: "warn" };
  const at = m.last_sign_in_at;
  if (!at) return { text: "Never signed in", tone: "warn" };
  const title = new Date(at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  const days = Math.floor((Date.now() - Date.parse(at)) / 86_400_000);
  const text = days < 1 ? "In today" : days === 1 ? "In yesterday" : days < 30 ? `In ${days} days ago` : days < 365 ? `In ${Math.floor(days / 30)} mo ago` : "In over a year ago";
  return { text, title: `Last signed in ${title}`, tone: days > 30 ? "quiet" : "ok" };
}

const TONE = {
  warn: "bg-[#fffaeb] text-[#b54708]",
  quiet: "bg-cream text-mute",
  ok: "bg-[#ecfdf3] text-[#067647]",
};

function MemberTable({
  members,
  meId,
  pending,
  adminReady,
  onEdit,
  onPassword,
  onEmail,
  onRole,
  onActive,
  onStake,
}: {
  members: TeamMember[];
  meId: string;
  pending: boolean;
  adminReady: boolean;
  onEdit: (m: TeamMember) => void;
  onPassword: (m: TeamMember) => void;
  onEmail: (m: TeamMember) => void;
  onRole: (m: TeamMember, role: Role) => void;
  onActive: (m: TeamMember, active: boolean) => void;
  onStake: (m: TeamMember, change: { is_firm_partner?: boolean; in_kavas_capital?: boolean }) => void;
}) {
  return (
    <ul className="rounded-2xl border border-line bg-card divide-y divide-line">
      {members.map((m) => {
        const seen = presence(m);
        const you = m.id === meId;
        return (
          <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <Disc id={m.id} name={label(m)} size={36} />
            <div className="min-w-0 flex-1 basis-48">
              <div className="truncate font-medium" title={label(m)}>
                {label(m)}
                {you && <span className="font-normal text-mute text-sm"> (you)</span>}
              </div>
              <div className="truncate text-xs text-mute" title={m.email}>{m.email}</div>
              {(m.is_firm_partner || m.in_kavas_capital) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.is_firm_partner && <span className="ws-chip bg-ink text-paper text-[11px]">Partner in the firm</span>}
                  {m.in_kavas_capital && <span className="ws-chip bg-cream text-[11px]">Kavas Capital</span>}
                </div>
              )}
            </div>
            {m.is_active && (
              <span className={`ws-chip text-xs ${TONE[seen.tone]}`} title={seen.title}>
                {seen.text}
              </span>
            )}
            <select
              className="ws-input !w-auto"
              value={m.role}
              disabled={pending}
              aria-label={`Role for ${label(m)}`}
              onChange={(e) => onRole(m, e.target.value as Role)}
            >
              <option value="member">Member</option>
              <option value="partner">Partner</option>
            </select>
            <div className="flex items-center gap-2">
              {m.is_active && m.invite_pending && (
                <button className="ws-btn" disabled={pending || !adminReady} onClick={() => onEmail(m)}>Resend invite</button>
              )}
              {!m.is_active && (
                <button className="ws-btn" disabled={pending} onClick={() => onActive(m, true)}>Reactivate</button>
              )}
              <RowMenu
                name={label(m)}
                items={[
                  { label: "Rename", run: () => onEdit(m) },
                  ...(m.is_active && !m.invite_pending
                    ? [{ label: "Email a sign-in link", run: () => onEmail(m), disabled: !adminReady }]
                    : []),
                  { label: "Set a password", run: () => onPassword(m), disabled: !adminReady },
                  {
                    label: m.is_firm_partner ? "✓ Partner in the firm" : "Partner in the firm",
                    run: () => onStake(m, { is_firm_partner: !m.is_firm_partner }),
                  },
                  {
                    label: m.in_kavas_capital ? "✓ Kavas Capital partner" : "Kavas Capital partner",
                    run: () => onStake(m, { in_kavas_capital: !m.in_kavas_capital }),
                  },
                ]}
                disabled={pending}
              />
              {m.is_active && !you && (
                <TwoTap
                  label="Deactivate"
                  armedLabel="Tap again to deactivate"
                  title={`${label(m)} can’t sign in until reactivated; their work stays`}
                  disabled={pending}
                  onConfirm={() => onActive(m, false)}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The quieter actions behind a ⋯ button, so each row shows only what's usually needed. */
function RowMenu({ name, items, disabled }: { name: string; items: { label: string; run: () => void; disabled?: boolean }[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button
        className="ws-btn !px-2.5"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More for ${name}`}
        title="More"
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 min-w-48 rounded-xl border border-line bg-card p-1 shadow-xl">
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              disabled={it.disabled}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-cream disabled:text-ghost disabled:hover:bg-transparent"
              onClick={() => {
                setOpen(false);
                it.run();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A readable throwaway password: four short words would be nicer, but this needs no word list. */
function suggestPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function PasswordField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <div className="flex gap-2">
      <input
        id={id}
        className="ws-input font-mono"
        type="text"
        autoComplete="new-password"
        spellCheck={false}
        minLength={MIN_PASSWORD}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="ws-btn" onClick={() => onChange(suggestPassword())}>Generate</button>
      <button
        type="button"
        className="ws-btn"
        disabled={!value}
        onClick={() => navigator.clipboard?.writeText(value).then(() => setCopied(true), () => {})}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function AddDialog({ onClose, onAdded }: { onClose: () => void; onAdded: (email: string, invited: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [mode, setMode] = useState<"invite" | "password">("invite");
  const [password, setPassword] = useState(suggestPassword);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Modal title="Add person" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const r = await addMember({ email, fullName, role, password: mode === "password" ? password : undefined });
            if (r.ok) onAdded(email.trim().toLowerCase(), mode === "invite");
            else setError(r.error);
          });
        }}
      >
        <div>
          <label className="ws-label" htmlFor="m-name">Name</label>
          <input id="m-name" className="ws-input" required autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="ws-label" htmlFor="m-email">Email</label>
          <input id="m-email" className="ws-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="ws-label" htmlFor="m-role">Role</label>
          <select id="m-role" className="ws-input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="member">Member — Tasks only</option>
            <option value="partner">Partner — everything</option>
          </select>
        </div>
        <fieldset>
          <legend className="ws-label">How they get in</legend>
          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="radio" name="m-mode" className="mt-1" checked={mode === "invite"} onChange={() => setMode("invite")} />
              <span>
                Email them an invite <span className="text-mute">— they choose their own password. Recommended.</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="m-mode" className="mt-1" checked={mode === "password"} onChange={() => setMode("password")} />
              <span>
                Set a password now <span className="text-mute">— you pass it on yourself.</span>
              </span>
            </label>
          </div>
        </fieldset>
        {mode === "password" && (
          <div>
            <label className="ws-label" htmlFor="m-password">Starting password</label>
            <PasswordField id="m-password" value={password} onChange={setPassword} />
            <p className="text-xs text-mute mt-1">
              Copy it before you save. They can change it under My account once they’re in.
            </p>
          </div>
        )}
        {error && <p className="text-sm text-[#b42318]" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="ws-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="ws-btn ws-btn--primary" disabled={pending}>
            {pending ? (mode === "invite" ? "Sending…" : "Adding…") : mode === "invite" ? "Send invite" : "Add"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NameDialog({ member, onClose, onSave }: { member: TeamMember; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(member.full_name ?? "");
  return (
    <Modal title={`Rename ${label(member)}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim());
        }}
      >
        <div>
          <label className="ws-label" htmlFor="n-name">Name</label>
          <input id="n-name" className="ws-input" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="ws-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="ws-btn ws-btn--primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordDialog({ member, onClose, onDone }: { member: TeamMember; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState(suggestPassword);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Modal title={`New password for ${label(member)}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const r = await setMemberPassword(member.id, password);
            if (r.ok) onDone();
            else setError(r.error);
          });
        }}
      >
        <div>
          <label className="ws-label" htmlFor="p-password">Password</label>
          <PasswordField id="p-password" value={password} onChange={setPassword} />
          <p className="text-xs text-mute mt-1">Their current password stops working as soon as you save.</p>
        </div>
        {error && <p className="text-sm text-[#b42318]" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="ws-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="ws-btn ws-btn--primary" disabled={pending}>{pending ? "Saving…" : "Set password"}</button>
        </div>
      </form>
    </Modal>
  );
}
