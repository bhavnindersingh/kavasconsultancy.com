"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Step = { step: string; name: string; body: string };

/**
 * "How We Work" — the four phases as a vertical journey.
 * A hairline spine draws itself as you scroll; each step's marker fills
 * and its text rises in when the step reaches the reading line.
 */
export default function ProcessSteps({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const items = gsap.utils.toArray<HTMLElement>(".pstep", el);
      const line = el.querySelector<HTMLElement>(".pspine__fill");

      if (reduced) {
        items.forEach((i) => i.classList.add("is-on"));
        if (line) line.style.transform = "scaleY(1)";
        return;
      }

      // spine draws across the whole list
      if (line) {
        gsap.fromTo(
          line,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top 65%",
              end: "bottom 75%",
              scrub: true,
            },
          }
        );
      }

      // each step lights up + rises as it crosses the reading line
      items.forEach((item) => {
        gsap.fromTo(
          item.querySelector(".pstep__inner"),
          { y: 26, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: item, start: "top 82%", once: true },
          }
        );
        ScrollTrigger.create({
          trigger: item,
          start: "top 62%",
          end: "bottom 45%",
          onToggle: (self) => item.classList.toggle("is-on", self.isActive),
        });
      });
    },
    { scope: ref }
  );

  return (
    <ol ref={ref} className="psteps">
      <span className="pspine" aria-hidden>
        <span className="pspine__fill" />
      </span>
      {steps.map((s) => (
        <li key={s.step} className="pstep">
          <span className="pstep__dot" aria-hidden />
          <div className="pstep__inner">
            <p className="pstep__num">{s.step}</p>
            <h3 className="pstep__name">{s.name}</h3>
            <p className="pstep__body">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
