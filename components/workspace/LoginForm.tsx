"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/workspace/supabase-browser";

export type LoginNotice = "inactive" | "link" | null;

const NOTICE_TEXT: Record<Exclude<LoginNotice, null>, string> = {
  inactive: "Your access to the workspace has been turned off. Ask a partner if that’s a mistake.",
  link: "That link has expired or was already used. Ask for a new one below.",
};

export default function LoginForm({ notice = null }: { notice?: LoginNotice }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "forgot">(notice === "link" ? "forgot" : "signin");
  const [message, setMessage] = useState<string | null>(notice ? NOTICE_TEXT[notice] : null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // A deactivated person still holds a session cookie; drop it so the next
  // sign-in starts clean.
  useEffect(() => {
    if (notice === "inactive") supabaseBrowser().auth.signOut();
  }, [notice]);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    setMessage(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    if (error) {
      setError(error.code === "user_banned" ? NOTICE_TEXT.inactive : error.message);
      setPending(false);
      return;
    }
    // The workspace layout reads cookies, so it renders fresh with the new session.
    // (No refresh() here — it would race the navigation and re-render /login.)
    router.replace("/tasks");
  }

  async function sendReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setPending(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    setPending(false);
    // The same words whether or not the address has an account, so this form
    // can't be used to find out who works here. Rate limits are the exception.
    if (error && error.status === 429) return setError("Too many reset emails just now. Try again in an hour, or ask a partner.");
    setMessage("If that address has an account, a reset link is on its way. Open it in this browser.");
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-mute text-sm mb-1">Kavas</p>
        <h1 className="font-serif text-4xl mb-8">{mode === "signin" ? "Workspace" : "Reset password"}</h1>
        {message && <p className="mb-6 rounded-lg bg-cream px-3 py-2 text-sm" role="status">{message}</p>}

        {mode === "signin" ? (
          <form onSubmit={signIn}>
            <label className="ws-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="ws-input mb-4" />
            <div className="flex items-baseline justify-between">
              <label className="ws-label" htmlFor="password">Password</label>
              <button type="button" className="text-xs text-mute underline underline-offset-2" onClick={() => { setMode("forgot"); setMessage(null); setError(null); }}>
                Forgot password?
              </button>
            </div>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="ws-input mb-6" />
            {error && <p className="text-sm text-[#b42318] mb-4" role="alert">{error}</p>}
            <button type="submit" disabled={pending} className="ws-btn ws-btn--primary w-full justify-center">
              {pending ? "Signing in…" : "Sign in"}
            </button>
            <p className="text-xs text-mute mt-6">Accounts are created by a partner. Ask one if you need access.</p>
          </form>
        ) : (
          <form onSubmit={sendReset}>
            <label className="ws-label" htmlFor="reset-email">Email</label>
            <input id="reset-email" name="email" type="email" autoComplete="email" required className="ws-input mb-6" />
            {error && <p className="text-sm text-[#b42318] mb-4" role="alert">{error}</p>}
            <button type="submit" disabled={pending} className="ws-btn ws-btn--primary w-full justify-center">
              {pending ? "Sending…" : "Email me a reset link"}
            </button>
            <p className="text-xs text-mute mt-6">
              No email? A partner can set a new password for you from the Team page.{" "}
              <button type="button" className="underline underline-offset-2" onClick={() => { setMode("signin"); setMessage(null); setError(null); }}>
                Back to sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
