import Link from "next/link";
import { FOOTER, NAV, SITE } from "@/lib/content";

/** Collins-pattern footer: dark cocoa, giant centred serif nav,
 *  pill, newsletter left / socials right.
 *
 *  The nav is derived from NAV — same items, same labels, same order as
 *  the header menu — so the two can't disagree. */
export default function Footer() {
  const bigNav = NAV.filter((n) => !FOOTER.bigNavExclude.includes(n.href));

  return (
    <footer className="site-footer">
      <div className="wrap flex min-h-[70svh] flex-col items-center justify-center py-24 text-center">
        <nav className="footer-nav">
          {bigNav.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.name}
            </Link>
          ))}
        </nav>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          <Link href={FOOTER.pill.href} className="pill pill--white">
            {FOOTER.pill.name}
          </Link>
        </div>
      </div>

      <div className="wrap flex flex-wrap items-center justify-between gap-6 pb-8">
        <div>
          <p className="footer-small mb-2 block opacity-70">
            {FOOTER.newsletterLabel}
          </p>
          <form
            className="email-field"
            action={`mailto:${SITE.email}`}
            method="post"
          >
            <span aria-hidden style={{ opacity: 0.6, fontSize: 12 }}>
              ✉
            </span>
            <input type="email" placeholder="Your email" aria-label="Email" />
          </form>
        </div>
        <nav className="flex gap-6">
          {SITE.social.map((s) => (
            <a key={s.name} href={s.href} className="footer-small">
              {s.name}
              {s.href === "#" && " *"}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
