"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Collins "Our Programs Deliver Impact" pattern:
 * ghost serif lines that ink up one at a time as they rise past the
 * reading line — and STAY inked. Reverting them on the way out left the
 * whole list greyed once the section was behind you, which reads as
 * disabled text rather than as a finished reveal. Scrolling back up
 * still resets, so the reveal replays.
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
          start: "top 62%",
          onEnter: () => item.classList.add("is-active"),
          onLeaveBack: () => item.classList.remove("is-active"),
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
