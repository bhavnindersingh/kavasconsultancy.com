import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import type { Profile } from "./types";

// cache(): one client per request, shared by the layout and the page.
export const supabaseServer = cache(async () => {
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
});

/**
 * Who is asking. `signedIn` is a valid login; `profile` is set only when that
 * login is also an active workspace member. A deactivated person is signed in
 * with no profile — RLS hides inactive profiles' rows, so they read as missing.
 */
export const currentSession = cache(async (): Promise<{ signedIn: boolean; profile: Profile | null }> => {
  const supabase = await supabaseServer();
  // getClaims verifies the JWT locally (no Auth round trip); the proxy has
  // already refreshed it. Revocation isn't seen until the token expires, but
  // a deactivated person still reads as no profile through RLS.
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { signedIn: false, profile: null };
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return { signedIn: true, profile: data && data.is_active ? (data as Profile) : null };
});

/** The signed-in, active profile — or null. Once per request, however many callers. */
export async function currentProfile(): Promise<Profile | null> {
  return (await currentSession()).profile;
}
