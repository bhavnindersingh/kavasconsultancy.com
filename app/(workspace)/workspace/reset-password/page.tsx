import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import NotConfigured from "@/components/workspace/NotConfigured";
import ResetPasswordForm from "@/components/workspace/ResetPasswordForm";
import { RECOVERY_COOKIE, isWorkspaceConfigured } from "@/lib/workspace/env";
import { currentSession } from "@/lib/workspace/supabase-server";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  await connection();
  if (!isWorkspaceConfigured) return <NotConfigured />;
  const [{ profile }, store] = await Promise.all([currentSession(), cookies()]);

  // Only straight after a reset link. Anyone else changes their password under
  // My account, where the current one is asked for first.
  if (!profile || !store.has(RECOVERY_COOKIE)) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl mb-3">This link has expired</h1>
          <p className="text-body mb-6">Reset links work once, for a short while. Ask for a new one from the sign-in page.</p>
          <Link href="/login" className="ws-btn ws-btn--primary">Back to sign in</Link>
        </div>
      </div>
    );
  }
  return <ResetPasswordForm email={profile.email} />;
}
