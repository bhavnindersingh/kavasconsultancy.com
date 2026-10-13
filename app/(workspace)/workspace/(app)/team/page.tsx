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
    .select("id, email, full_name, role, is_active, created_at, is_firm_partner, in_kavas_capital")
    .order("is_active", { ascending: false })
    .order("full_name");

  // Last sign-in lives on the auth user, which only the admin API can read.
  // So does whether an invite is still waiting to be accepted.
  const auth = new Map<string, { last: string | null; pending: boolean }>();
  if (isAdminConfigured) {
    const { data } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1000 });
    data?.users.forEach((u) => auth.set(u.id, { last: u.last_sign_in_at ?? null, pending: !u.email_confirmed_at }));
  }

  const members: TeamMember[] = (profiles ?? []).map((p) => ({
    ...p,
    last_sign_in_at: auth.get(p.id)?.last ?? null,
    invite_pending: auth.get(p.id)?.pending ?? false,
  }));
  return <TeamApp members={members} adminReady={isAdminConfigured} />;
}
