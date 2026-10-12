import { redirect } from "next/navigation";
import { connection } from "next/server";
import NotConfigured from "@/components/workspace/NotConfigured";
import Shell from "@/components/workspace/Shell";
import { isWorkspaceConfigured } from "@/lib/workspace/env";
import { currentProfile, supabaseServer } from "@/lib/workspace/supabase-server";
import type { Profile } from "@/lib/workspace/types";

export default async function WorkspaceAppLayout({ children }: { children: React.ReactNode }) {
  // Per-request, always: these screens depend on the session cookie and must
  // never be prerendered, even when a build runs without Supabase env vars.
  await connection();
  if (!isWorkspaceConfigured) return <NotConfigured />;
  const supabase = await supabaseServer();
  // In parallel: who's asking, and everyone (deactivated included, so their
  // name still shows on the work they did; the provider offers only active
  // people for new assignments). Signed out, RLS returns no people.
  const [me, { data: people }] = await Promise.all([
    currentProfile(),
    supabase.from("profiles").select("id, email, full_name, role, is_active").order("full_name"),
  ]);
  if (!me) redirect("/login");

  return (
    <Shell me={me} people={(people ?? []) as Profile[]}>
      {children}
    </Shell>
  );
}
