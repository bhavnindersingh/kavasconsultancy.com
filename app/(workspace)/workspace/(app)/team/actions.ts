"use server";

import { createClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/workspace/env";
import { workspaceOrigin } from "@/lib/workspace/mailer";
import { supabaseAdmin } from "@/lib/workspace/supabase-admin";
import { currentProfile, supabaseServer } from "@/lib/workspace/supabase-server";
import { MIN_PASSWORD, type Role } from "@/lib/workspace/types";

// Every action here is a public POST endpoint. The partner check at the top of
// each is the gate — the admin client below it bypasses RLS. Errors come back
// as values, because a thrown message is redacted in production.

export type ActionResult = { ok: true } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES: Role[] = ["partner", "member"];
// A deactivated login is banned at the auth layer too, so an open session stops
// refreshing instead of lingering until its token expires. ~100 years.
const BANNED = "876000h";

async function asPartner() {
  const me = await currentProfile();
  return me?.role === "partner" ? me : null;
}

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function passwordProblem(password: string) {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters`;
  if (password.length > 72) return "Use at most 72 characters";
  return null;
}

/**
 * Adds a person. With no password they get an invite email and choose their
 * own (the default); with one, they can sign in straight away and the partner
 * passes the password on.
 */
export async function addMember(input: { email: string; fullName: string; role: Role; password?: string }): Promise<ActionResult> {
  if (!(await asPartner())) return fail("Only a partner can add people");
  const email = String(input.email ?? "").trim().toLowerCase();
  const fullName = String(input.fullName ?? "").trim();
  const password = String(input.password ?? "");
  if (!EMAIL.test(email)) return fail("Enter a valid email address");
  if (!fullName) return fail("Enter their name");
  if (!ROLES.includes(input.role)) return fail("Pick a role");
  if (password) {
    const weak = passwordProblem(password);
    if (weak) return fail(weak);
  }

  const admin = supabaseAdmin().auth.admin;
  const { data, error } = password
    ? await admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } })
    : await admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo: `${await workspaceOrigin()}/auth/confirm` });
  if (error) return fail(error.message);

  // The profile row is made by the handle_new_user trigger as a member.
  // Promoting goes through the partner's own session, so the DB guards apply.
  if (input.role === "partner") {
    const supabase = await supabaseServer();
    const { error: roleError } = await supabase.from("profiles").update({ role: "partner" }).eq("id", data.user.id);
    if (roleError) return fail(`Added, but not made a partner: ${roleError.message}`);
  }
  refresh();
  return { ok: true };
}

export async function updateMember(
  userId: string,
  change: { full_name?: string; role?: Role; is_active?: boolean },
): Promise<ActionResult> {
  const me = await asPartner();
  if (!me) return fail("Only a partner can change the team");
  if (!UUID.test(userId)) return fail("Unknown person");

  const fields: { full_name?: string; role?: Role; is_active?: boolean } = {};
  if (change.full_name !== undefined) {
    const name = String(change.full_name).trim();
    if (!name) return fail("Enter a name");
    fields.full_name = name;
  }
  if (change.role !== undefined) {
    if (!ROLES.includes(change.role)) return fail("Pick a role");
    fields.role = change.role;
  }
  if (change.is_active !== undefined) {
    if (userId === me.id && !change.is_active) return fail("You can’t deactivate yourself");
    fields.is_active = Boolean(change.is_active);
  }
  if (!Object.keys(fields).length) return { ok: true };

  const admin = supabaseAdmin();
  // Reactivating: lift the ban before the profile says they're back.
  if (fields.is_active === true) {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
    if (error) return fail(error.message);
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("profiles").update(fields).eq("id", userId).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("Unknown person");

  // Deactivating: the profile change landed (the last-partner guard passed), so
  // now stop the login itself.
  if (fields.is_active === false) {
    const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: BANNED });
    if (banError) return fail(`Deactivated, but their login is still open: ${banError.message}`);
  }
  refresh();
  return { ok: true };
}

export async function setMemberPassword(userId: string, password: string): Promise<ActionResult> {
  if (!(await asPartner())) return fail("Only a partner can set passwords");
  if (!UUID.test(userId)) return fail("Unknown person");
  const weak = passwordProblem(String(password ?? ""));
  if (weak) return fail(weak);
  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { password: String(password) });
  if (error) return fail(error.message);
  return { ok: true };
}

/**
 * Emails someone a way in: their invite again if they never accepted it, a
 * choose-a-new-password link otherwise. The dependable "I can't get in"
 * button — the person doesn't need to remember which they had.
 */
export async function sendAccessEmail(userId: string): Promise<ActionResult & { sent?: "invite" | "reset" }> {
  if (!(await asPartner())) return fail("Only a partner can send sign-in emails");
  if (!UUID.test(userId)) return fail("Unknown person");
  const admin = supabaseAdmin().auth.admin;
  const { data, error } = await admin.getUserById(userId);
  if (error || !data.user?.email) return fail(error?.message ?? "Unknown person");
  const user = data.user;
  const email = data.user.email;
  if (user.banned_until && new Date(user.banned_until) > new Date()) return fail("Reactivate them first");

  const redirectTo = `${await workspaceOrigin()}/auth/confirm`;
  if (!user.email_confirmed_at) {
    const { error: inviteError } = await admin.inviteUserByEmail(email, { redirectTo });
    if (!inviteError) return { ok: true, sent: "invite" };
  }
  // The public endpoint, so Supabase's own rate limit and email template apply.
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: resetError } = await anon.auth.resetPasswordForEmail(email, { redirectTo });
  if (resetError) return fail(resetError.status === 429 ? "Too many emails just now — try again in a few minutes" : resetError.message);
  return { ok: true, sent: "reset" };
}
