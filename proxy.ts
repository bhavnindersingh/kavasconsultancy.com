import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * work.kavasconsultancy.com → the workspace (app/(workspace)/workspace/*).
 *
 * The subdomain is served by this same app: requests on a `work.` host are
 * rewritten under /workspace, so the browser sees work.kavasconsultancy.com/tasks
 * while Next renders /workspace/tasks. Workspace links are therefore written
 * subdomain-relative ("/tasks", never "/workspace/tasks").
 *
 * /workspace on any other host redirects to the subdomain, so there is one
 * canonical URL. Locally, use http://work.localhost:3340.
 *
 * Note the marketing site's /work (case studies) is unrelated and unaffected.
 */
const PREFIX = "/workspace";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;

  if (!host.startsWith("work.")) {
    if (pathname === PREFIX || pathname.startsWith(`${PREFIX}/`)) {
      const apex = host.replace(/^www\./, "");
      const rest = pathname.slice(PREFIX.length) || "/";
      const proto = request.nextUrl.protocol;
      return NextResponse.redirect(`${proto}//work.${apex}${rest}${search}`);
    }
    return NextResponse.next();
  }

  // Already-prefixed paths on the subdomain would double up; send them home.
  if (pathname === PREFIX || pathname.startsWith(`${PREFIX}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(PREFIX.length) || "/";
    return NextResponse.redirect(url);
  }

  const target = request.nextUrl.clone();
  target.pathname = `${PREFIX}${pathname === "/" ? "" : pathname}`;

  let response = NextResponse.rewrite(target, { request });

  // Keep the Supabase session fresh: getUser() rotates an expiring token and
  // writes the new cookies onto both the forwarded request and the response.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.rewrite(target, { request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and files with an extension (images,
    // video, icon.svg, …) so the marketing site's assets never pass through.
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
