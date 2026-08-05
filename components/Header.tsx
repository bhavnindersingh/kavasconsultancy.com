"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { NAV, SITE } from "@/lib/content";
import Logo from "@/components/Logo";

const DARK_ROUTES = ["/work", "/studio"]; // dark-ground pages (index only)

export default function Header() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [edge, setEdge] = useState(16); // header side padding in px (menu wipe start width)
  const headerRef = useRef<HTMLElement>(null);
  const lastY = useRef(0);
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);

  const openMenu = () => {
    if (headerRef.current) {
      setEdge(parseFloat(getComputedStyle(headerRef.current).paddingLeft) || 16);
    }
    setOpen(true);
  };

  // close menu on route change (state-adjustment-during-render pattern)
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (open) setOpen(false);
  }

  const dark = DARK_ROUTES.includes(pathname);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > 120 && y > lastY.current);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        ref={headerRef}
        className={`site-header ${dark ? "header-dark" : ""} ${
          hidden && !open ? "is-hidden" : ""
        }`}
      >
        <Link href="/" className="wordmark" aria-label="Kavas — home">
          <Logo className="logo" />
        </Link>
        <button
          className="menu-btn"
          onClick={openMenu}
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <i />
          <i />
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={{ clipPath: `inset(0px ${edge}px 100% ${edge}px round 14px)` }}
            animate={{ clipPath: "inset(0px 0px 0% 0px round 0px)" }}
            exit={{ clipPath: `inset(0px ${edge}px 100% ${edge}px round 14px)` }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[90] overflow-y-auto"
            style={{ background: "var(--color-cocoa)" }}
          >
            <div className="site-header header-dark">
              <Link href="/" className="wordmark">
                <Logo className="logo" />
              </Link>
              <button
                className="menu-btn"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <span
                  className="serif"
                  style={{
                    color: "var(--color-cream)",
                    fontSize: 26,
                    lineHeight: 1,
                  }}
                  aria-hidden
                >
                  ×
                </span>
              </button>
            </div>

            <nav className="menu-list flex min-h-[calc(100svh-60px)] flex-col items-center justify-center gap-1 py-24 text-center">
              {NAV.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.06 + i * 0.05,
                    duration: 0.65,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Link
                    href={item.href}
                    className="menu-link"
                    onClick={() => setOpen(false)}
                  >
                    {item.name}
                  </Link>
                </motion.div>
              ))}

              <motion.p
                className="mt-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <a className="footer-small" href={`mailto:${SITE.email}`}>
                  {SITE.email}
                </a>
              </motion.p>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
