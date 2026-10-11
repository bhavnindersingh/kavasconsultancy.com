import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * The project's secret key bypasses RLS entirely. It is read only here, never
 * NEXT_PUBLIC_, and only Team-page server actions use it — each one checks the
 * caller is an active partner first, because that check is the only gate.
 */
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";

export const isAdminConfigured = Boolean(SUPABASE_URL && SECRET_KEY);

export function supabaseAdmin() {
  if (!isAdminConfigured) throw new Error("SUPABASE_SECRET_KEY is not set on the server");
  return createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
