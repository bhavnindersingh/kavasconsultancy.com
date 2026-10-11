import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import LoginForm from "@/components/workspace/LoginForm";
import NotConfigured from "@/components/workspace/NotConfigured";
import { isWorkspaceConfigured } from "@/lib/workspace/env";
import { currentSession } from "@/lib/workspace/supabase-server";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Per-request, always: these screens depend on the session cookie and must
  // never be prerendered, even when a build runs without Supabase env vars.
  await connection();
  if (!isWorkspaceConfigured) return <NotConfigured />;
  const { signedIn, profile } = await currentSession();
  if (profile) redirect("/tasks");
  // Signed in but no active profile: a partner deactivated them.
  if (signedIn) return <LoginForm notice="inactive" />;
  const { error } = await searchParams;
  return <LoginForm notice={error === "link" ? "link" : null} />;
}
