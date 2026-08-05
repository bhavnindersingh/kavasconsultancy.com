"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Collins "Our Programs Deliver Impact" pattern:
 * ghost serif lines that ink up one at a time as they cross
 * the middle of the viewport.
 */
export default function ImpactList({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const items = gsap.utils.toArray<HTMLElement>(".impact-line", el);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reduced) {
        items.forEach((i) => i.classList.add("is-active"));
        return;
      }

      items.forEach((item) => {
        ScrollTrigger.create({
          trigger: item,
          start: "top 58%",
          end: "bottom 42%",
          onToggle: (self) => item.classList.toggle("is-active", self.isActive),
        });
      });
    },
    { scope: ref }
  );

  return (
    <ul ref={ref}>
      {lines.map((line) => (
        <li key={line} className="impact-line">
          {line}
        </li>
      ))}
    </ul>
  );
}
