import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import type { Profile } from "./types";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(toSet) {
        // Server Components can't write cookies; the proxy refreshes the
        // session on every request, so a failed write here is harmless.
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

/**
 * Who is asking. `signedIn` is a valid login; `profile` is set only when that
 * login is also an active workspace member. A deactivated person is signed in
 * with no profile — RLS hides inactive profiles' rows, so they read as missing.
 */
export async function currentSession(): Promise<{ signedIn: boolean; profile: Profile | null }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, profile: null };
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { signedIn: true, profile: data && data.is_active ? (data as Profile) : null };
}

/** The signed-in, active profile — or null. */
export async function currentProfile(): Promise<Profile | null> {
  return (await currentSession()).profile;
}
