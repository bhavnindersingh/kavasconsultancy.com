"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";
import { MIN_PASSWORD } from "@/lib/workspace/types";
import PasswordInput from "./PasswordInput";

export default function ResetPasswordForm({ email, name, welcome }: { email: string; name: string | null; welcome: boolean }) {
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters`);
    if (next !== again) return setError("The two passwords don’t match");
    setPending(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: next });
    if (error) {
      setPending(false);
      return setError(error.message);
    }
    // A full load: the recovery cookie is spent and the session is ordinary now.
    window.location.replace("/tasks");
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <p className="text-mute text-sm mb-1">Kavas Workspace</p>
        <h1 className="font-serif text-4xl mb-2">{welcome ? `Welcome${name ? `, ${name.split(" ")[0]}` : ""}` : "New password"}</h1>
        <p className="text-sm text-mute mb-8">
          {welcome ? `Choose a password for ${email}. You’ll use it to sign in from now on.` : `For ${email}`}
        </p>
        <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
        <label className="ws-label" htmlFor="np">New password</label>
        <PasswordInput id="np" autoComplete="new-password" required minLength={MIN_PASSWORD} className="mb-4" value={next} onChange={(e) => setNext(e.target.value)} />
        <label className="ws-label" htmlFor="np2">Again</label>
        <PasswordInput id="np2" autoComplete="new-password" required className="mb-6" value={again} onChange={(e) => setAgain(e.target.value)} />
        {error && <p className="text-sm text-[#b42318] mb-4" role="alert">{error}</p>}
        <button type="submit" disabled={pending} className="ws-btn ws-btn--primary w-full justify-center">
          {pending ? "Saving…" : welcome ? "Choose password and start" : "Save and sign in"}
        </button>
      </form>
    </div>
  );
}
