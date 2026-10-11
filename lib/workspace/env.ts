export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** The workspace runs only once a Supabase project is wired in. */
export const isWorkspaceConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Set for 15 minutes after a password-reset link is used; /reset-password requires it. */
export const RECOVERY_COOKIE = "ws_recovery";
