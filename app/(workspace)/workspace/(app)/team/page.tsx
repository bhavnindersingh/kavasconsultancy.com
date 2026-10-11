import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TeamApp, { type TeamMember } from "@/components/workspace/team/TeamApp";
import { isAdminConfigured, supabaseAdmin } from "@/lib/workspace/supabase-admin";
import { currentProfile, supabaseServer } from "@/lib/workspace/supabase-server";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await currentProfile();
  if (me?.role !== "partner") notFound();

  const supabase = await supabaseServer();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at")
    .order("is_active", { ascending: false })
    .order("full_name");

  // Last sign-in lives on the auth user, which only the admin API can read.
  const lastSignIn = new Map<string, string | null>();
  if (isAdminConfigured) {
    const { data } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1000 });
    data?.users.forEach((u) => lastSignIn.set(u.id, u.last_sign_in_at ?? null));
  }

  const members: TeamMember[] = (profiles ?? []).map((p) => ({ ...p, last_sign_in_at: lastSignIn.get(p.id) ?? null }));
  return <TeamApp members={members} adminReady={isAdminConfigured} />;
}
