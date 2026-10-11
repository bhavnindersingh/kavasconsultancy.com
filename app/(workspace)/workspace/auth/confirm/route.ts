import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { RECOVERY_COOKIE } from "@/lib/workspace/env";
import { supabaseServer } from "@/lib/workspace/supabase-server";

/**
 * Where the emailed password-reset link lands (work.<host>/auth/confirm).
 *
 * Supabase sends either `?code=` (PKCE — the browser that asked for the link
 * holds the verifier cookie) or `?token_hash=&type=` (a custom email template).
 * Either becomes a session in cookies, then the person picks a new password.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const supabase = await supabaseServer();
  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;

  // Paths are subdomain-relative: the proxy maps /reset-password → /workspace/reset-password.
  // The origin comes from the Host header, not request.url: behind the proxy's
  // rewrite, request.url carries the server's own hostname and drops `work.`.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const to = new URL(ok ? "/reset-password" : "/login?error=link", `${proto}://${host}`);
  const response = NextResponse.redirect(to);
  if (ok) {
    response.cookies.set(RECOVERY_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: to.protocol === "https:", maxAge: 15 * 60, path: "/" });
  }
  return response;
}
