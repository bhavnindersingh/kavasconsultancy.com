"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Collins-style banner: starts inset-small and grows to full as it
 * scrolls in. With `wipe`, the media opens from the center out to
 * the edges (horizontal clip-path reveal) while it grows.
 */
export default function ScrollGrow({
  children,
  from = 0.9,
  wipe = false,
  radiusFrom = 24,
  radiusTo = 16,
  className,
}: {
  children: ReactNode;
  from?: number;
  wipe?: boolean;
  /** corner rounding during/after the wipe (0 = square, for full-bleed) */
  radiusFrom?: number;
  radiusTo?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.fromTo(
        el,
        {
          scale: from,
          ...(wipe && {
            clipPath: `inset(0% 21% 0% 21% round ${radiusFrom}px)`,
          }),
        },
        {
          scale: 1,
          ...(wipe && {
            clipPath: `inset(0% 0% 0% 0% round ${radiusTo}px)`,
          }),
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 95%",
            end: "top 28%",
            scrub: true,
          },
        }
      );
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
