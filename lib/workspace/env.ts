export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** The workspace runs only once a Supabase project is wired in. */
export const isWorkspaceConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Set for 30 minutes after an invite or reset link is used; /reset-password requires it. Value: "invite" | "recovery". */
export const RECOVERY_COOKIE = "ws_recovery";
