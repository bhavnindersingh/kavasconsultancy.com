"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Lenis smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync. */
export default function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      anchors: true,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Start every route at the top.
  // Lenis keeps its own scroll target and cached page height, and the route
  // swap happens inside a view transition, so a single reset can be undone a
  // frame later by in-flight momentum or a stale height clamp. Hold the top
  // for a few frames while the new page settles — but yield immediately if
  // the reader actually scrolls.
  useEffect(() => {
    const lenis = lenisRef.current;
    let cancelled = false;
    let raf = 0;
    const release = () => {
      cancelled = true;
    };
    const opts = { passive: true, once: true } as const;
    window.addEventListener("wheel", release, opts);
    window.addEventListener("touchstart", release, opts);
    window.addEventListener("keydown", release, { once: true });

    const started = performance.now();
    const pinToTop = () => {
      if (cancelled) return;
      if (window.scrollY !== 0) {
        lenis?.scrollTo(0, { immediate: true, force: true });
        window.scrollTo(0, 0);
      }
      if (performance.now() - started < 400) {
        raf = requestAnimationFrame(pinToTop);
      } else {
        lenis?.resize(); // re-measure now that the new page has laid out
        ScrollTrigger.refresh();
      }
    };
    pinToTop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", release);
    };
  }, [pathname]);

  return null;
}
