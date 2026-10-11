import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { RECOVERY_COOKIE } from "@/lib/workspace/env";
import { supabaseServer } from "@/lib/workspace/supabase-server";

const TYPES: EmailOtpType[] = ["invite", "recovery", "magiclink", "email"];

/**
 * Where every emailed link lands (work.<host>/auth/confirm).
 *
 * The workspace's email templates send `?token_hash=&type=`, which works on
 * any device. `?code=` is the PKCE form Supabase's stock templates use; it only
 * works in the browser that asked for the link, and is kept for those.
 *
 * invite / recovery → choose a password (the cookie tells the page which).
 * magiclink         → straight in.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const rawType = params.get("type") as EmailOtpType | null;
  const type = rawType && TYPES.includes(rawType) ? rawType : null;

  const supabase = await supabaseServer();
  let ok = false;
  if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  else if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;

  const choosesPassword = type === "invite" || type === "recovery" || (!!code && !type);
  const path = !ok ? "/login?error=link" : choosesPassword ? "/reset-password" : "/tasks";

  // Paths are subdomain-relative: the proxy maps /reset-password → /workspace/reset-password.
  // The origin comes from the Host header, not request.url: behind the proxy's
  // rewrite, request.url carries the server's own hostname and drops `work.`.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const to = new URL(path, `${proto}://${host}`);
  const response = NextResponse.redirect(to);
  if (ok && choosesPassword) {
    response.cookies.set(RECOVERY_COOKIE, type === "invite" ? "invite" : "recovery", {
      httpOnly: true,
      sameSite: "lax",
      secure: to.protocol === "https:",
      maxAge: 30 * 60,
      path: "/",
    });
  }
  return response;
}
