"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * While this section is in view, the whole page ground (--page-bg)
 * eases to `color`, and eases back on leave — Collins-style ambient
 * color shift on scroll.
 */
export default function TintSection({
  color,
  darkContent = false,
  start = "top 25%",
  end = "bottom 60%",
  persistBelow = false,
  className,
  children,
}: {
  color: string;
  /** true when `color` is dark — flips the section's text to light while tinted */
  darkContent?: boolean;
  /** ScrollTrigger start — default waits until the section fills the frame */
  start?: string;
  end?: string;
  /** keep the tint once scrolled past (only reverts on the way back up) */
  persistBelow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const root = document.documentElement;
      const base =
        getComputedStyle(root).getPropertyValue("--page-bg").trim() ||
        "#f8f8f7";
      const tint = (c: string, on: boolean) => {
        gsap.to(root, { "--page-bg": c, duration: 0.7, ease: "power2.out" });
        if (darkContent) el.classList.toggle("tint-dark", on);
      };

      ScrollTrigger.create({
        trigger: el,
        start,
        end,
        onEnter: () => tint(color, true),
        onEnterBack: () => tint(color, true),
        // scrolling down past the section: hold the tint (and the section's
        // light text, since it's still partly on screen) so the page stays
        // dark through the notes band and footer
        onLeave: () => {
          if (!persistBelow) tint(base, false);
        },
        onLeaveBack: () => tint(base, false),
      });
    },
    { scope: ref }
  );

  return (
    <section ref={ref} className={`tint-scope ${className ?? ""}`}>
      {children}
    </section>
  );
}
