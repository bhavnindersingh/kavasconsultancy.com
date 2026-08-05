"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Collins /programs hero: floating media cards scattered around the
 * thesis, drifting at different speeds on scroll; a couple blurred
 * for depth. Each card is a placeholder tint — swap for real crops.
 */
const ITEMS: {
  top: string;
  left: string;
  w: string;
  ar: string;
  tint: string;
  blur?: boolean;
  speed: number; // parallax factor
}[] = [
  { top: "2%", left: "34%", w: "13vw", ar: "3/4", tint: "b", speed: -60 },
  { top: "6%", left: "10%", w: "7vw", ar: "1/1", tint: "c", blur: true, speed: 40 },
  { top: "16%", left: "55%", w: "11vw", ar: "3/4", tint: "d", speed: -30 },
  { top: "22%", left: "80%", w: "6vw", ar: "3/4", tint: "a", blur: true, speed: 70 },
  { top: "30%", left: "26%", w: "9vw", ar: "16/10", tint: "e", speed: 50 },
  { top: "40%", left: "66%", w: "8vw", ar: "3/4", tint: "b", speed: -45 },
  { top: "46%", left: "12%", w: "10vw", ar: "4/5", tint: "c", speed: 30 },
  { top: "56%", left: "44%", w: "7vw", ar: "1/1", tint: "d", blur: true, speed: 60 },
  { top: "60%", left: "78%", w: "9vw", ar: "4/5", tint: "e", speed: -35 },
];

export default function Scatter() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        return;

      gsap.utils.toArray<HTMLElement>(".scatter__item", el).forEach((item) => {
        const speed = Number(item.dataset.speed || 0);
        gsap.to(item, {
          y: speed * 3,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className="absolute inset-0" aria-hidden>
      {ITEMS.map((it, i) => (
        <div
          key={i}
          data-speed={it.speed}
          className={`scatter__item ${it.blur ? "scatter__item--blur" : ""}`}
          style={{
            top: it.top,
            left: it.left,
            width: `clamp(56px, ${it.w}, 220px)`,
            aspectRatio: it.ar,
          }}
        >
          <div className={`tint tint--${it.tint}`}>
            <span style={{ fontSize: 13, opacity: 0.4 }}>img</span>
          </div>
        </div>
      ))}
    </div>
  );
}
