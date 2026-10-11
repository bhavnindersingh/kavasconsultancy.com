"use client";

import { useState, useTransition } from "react";
import { addMember, setMemberPassword, updateMember, type ActionResult } from "@/app/(workspace)/workspace/(app)/team/actions";
import { MIN_PASSWORD, type Profile, type Role } from "@/lib/workspace/types";
import Modal from "../Modal";
import { useWorkspace } from "../WorkspaceContext";

export type TeamMember = Profile & { created_at?: string; last_sign_in_at: string | null };

export default function TeamApp({ members, adminReady }: { members: TeamMember[]; adminReady: boolean }) {
  const { me } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [passwordFor, setPasswordFor] = useState<TeamMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(action: () => Promise<ActionResult>, done?: string) {
    setError(null);
    setNotice(null);
    start(async () => {
      const r = await action();
      if (!r.ok) setError(r.error);
      else if (done) setNotice(done);
    });
  }

  const active = members.filter((m) => m.is_active);
  const inactive = members.filter((m) => !m.is_active);

  return (
    <div className="max-w-4xl">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl">Team</h1>
          <p className="text-sm text-mute mt-1">
            Members work Tasks. Partners also see Documents, Accounts and this page.
          </p>
        </div>
        <button className="ws-btn ws-btn--primary" disabled={!adminReady} onClick={() => setAdding(true)}>
          Add person
        </button>
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

      <MemberTable
        members={active}
        meId={me.id}
        pending={pending}
        adminReady={adminReady}
        onEdit={setEditing}
        onPassword={setPasswordFor}
        onRole={(m, role) => run(() => updateMember(m.id, { role }), `${label(m)} is now a ${role}.`)}
        onActive={(m, is_active) => run(() => updateMember(m.id, { is_active }), `${label(m)} has been deactivated.`)}
      />

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
            onRole={(m, role) => run(() => updateMember(m.id, { role }))}
            onActive={(m, is_active) => run(() => updateMember(m.id, { is_active }), `${label(m)} can sign in again.`)}
          />
        </>
      )}

      {adding && (
        <AddDialog
          onClose={() => setAdding(false)}
          onAdded={(email) => {
            setAdding(false);
            setNotice(`${email} can sign in now. Send them the password you set, somewhere private.`);
          }}
        />
      )}
      {editing && (
        <NameDialog
          member={editing}
          onClose={() => setEditing(null)}
          onSave={(full_name) => {
            setEditing(null);
            run(() => updateMember(editing.id, { full_name }));
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

function lastSeen(at: string | null) {
  if (!at) return "Never signed in";
  return `Last in ${new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

function MemberTable({
  members,
  meId,
  pending,
  adminReady,
  onEdit,
  onPassword,
  onRole,
  onActive,
}: {
  members: TeamMember[];
  meId: string;
  pending: boolean;
  adminReady: boolean;
  onEdit: (m: TeamMember) => void;
  onPassword: (m: TeamMember) => void;
  onRole: (m: TeamMember, role: Role) => void;
  onActive: (m: TeamMember, active: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card divide-y divide-line">
      {members.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0 flex-1 basis-56">
            <div className="truncate">
              {label(m)}
              {m.id === meId && <span className="text-mute text-sm"> (you)</span>}
            </div>
            <div className="truncate text-xs text-mute">
              {m.email} · {lastSeen(m.last_sign_in_at)}
            </div>
          </div>
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
          <div className="flex flex-wrap gap-2">
            <button className="ws-btn" disabled={pending} onClick={() => onEdit(m)}>Rename</button>
            <button className="ws-btn" disabled={pending || !adminReady} onClick={() => onPassword(m)}>Set password</button>
            {m.is_active ? (
              m.id !== meId && (
                <button className="ws-btn ws-btn--danger" disabled={pending} onClick={() => onActive(m, false)}>
                  Deactivate
                </button>
              )
            ) : (
              <button className="ws-btn" disabled={pending} onClick={() => onActive(m, true)}>Reactivate</button>
            )}
          </div>
        </div>
      ))}
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
    </div>
  );
}

function AddDialog({ onClose, onAdded }: { onClose: () => void; onAdded: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("member");
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
            const r = await addMember({ email, fullName, role, password });
            if (r.ok) onAdded(email.trim().toLowerCase());
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
        <div>
          <label className="ws-label" htmlFor="m-password">Starting password</label>
          <PasswordField id="m-password" value={password} onChange={setPassword} />
          <p className="text-xs text-mute mt-1">
            Copy it before you save. They can change it under My account once they’re in.
          </p>
        </div>
        {error && <p className="text-sm text-[#b42318]" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="ws-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="ws-btn ws-btn--primary" disabled={pending}>{pending ? "Adding…" : "Add"}</button>
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
