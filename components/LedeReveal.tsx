"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Collins case-lede pattern: serif paragraph whose words ink up
 * from ghost → ink as it scrolls through the viewport.
 */
export default function LedeReveal({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(" ");

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const targets = gsap.utils.toArray<HTMLElement>(".w", el);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reduced) {
        targets.forEach((t) => t.classList.add("lit"));
        return;
      }

      ScrollTrigger.create({
        trigger: el,
        start: "top 82%",
        end: "bottom 45%",
        scrub: true,
        onUpdate: (self) => {
          const n = Math.round(self.progress * targets.length);
          targets.forEach((t, i) => t.classList.toggle("lit", i < n));
        },
      });
    },
    { scope: ref }
  );

  return (
    <p ref={ref} className="lede lede-reveal max-w-[19em]">
      {words.map((w, i) => (
        <span key={i}>
          <span className="w">{w}</span>{" "}
        </span>
      ))}
    </p>
  );
}
