"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import { MIN_PASSWORD } from "@/lib/workspace/types";
import { useWorkspace } from "./WorkspaceContext";

export default function AccountSettings() {
  const { me } = useWorkspace();
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [name, setName] = useState(me.full_name ?? "");
  const [nameState, setNameState] = useState<string | null>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", me.id);
    setNameState(error ? error.message : "Saved.");
    if (!error) router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwDone(false);
    if (next.length < MIN_PASSWORD) return setPwError(`Use at least ${MIN_PASSWORD} characters`);
    if (next !== again) return setPwError("The two new passwords don’t match");
    if (next === current) return setPwError("That’s your current password");
    setPending(true);
    // Prove the current password first, so an unattended open session can't be
    // used to lock its owner out.
    const check = await supabase.auth.signInWithPassword({ email: me.email, password: current });
    if (check.error) {
      setPending(false);
      return setPwError("Your current password isn’t right");
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setPending(false);
    if (error) return setPwError(error.message);
    setCurrent("");
    setNext("");
    setAgain("");
    setPwDone(true);
  }

  return (
    <div className="max-w-md">
      <h1 className="font-serif text-3xl mb-1">My account</h1>
      <p className="text-sm text-mute mb-8">
        {me.email} · <span className="capitalize">{me.role}</span>
      </p>

      <form onSubmit={saveName} className="mb-10">
        <h2 className="text-sm font-medium mb-3">Name</h2>
        <div className="flex gap-2">
          <input className="ws-input" aria-label="Name" required value={name} onChange={(e) => { setName(e.target.value); setNameState(null); }} />
          <button className="ws-btn" type="submit">Save</button>
        </div>
        {nameState && <p className="text-sm text-mute mt-2" role="status">{nameState}</p>}
      </form>

      <form onSubmit={changePassword} className="space-y-4">
        <h2 className="text-sm font-medium">Change password</h2>
        <div>
          <label className="ws-label" htmlFor="pw-current">Current password</label>
          <input id="pw-current" className="ws-input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="ws-label" htmlFor="pw-next">New password</label>
          <input id="pw-next" className="ws-input" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div>
          <label className="ws-label" htmlFor="pw-again">New password, again</label>
          <input id="pw-again" className="ws-input" type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
        </div>
        {pwError && <p className="text-sm text-[#b42318]" role="alert">{pwError}</p>}
        {pwDone && <p className="text-sm text-[#067647]" role="status">Password changed. Use the new one next time you sign in.</p>}
        <button className="ws-btn ws-btn--primary" type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
