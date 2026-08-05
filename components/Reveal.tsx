"use client";

import { useRef, type ReactNode, type ElementType } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Masked-rise reveal. Wrap words yourself with <Word> for word-level
 * masks, or pass plain children for a single-block rise.
 */
export function Word({ children }: { children: ReactNode }) {
  return (
    <span className="mask">
      <span data-reveal-target>{children}</span>
    </span>
  );
}

export default function Reveal({
  as: Tag = "div",
  className,
  children,
  delay = 0,
  y = false,
  once = true,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  delay?: number;
  /** true = animate the whole block up+fade instead of masked spans */
  y?: boolean;
  once?: boolean;
  /** anything else (event handlers, aria-*) lands on the element */
  [key: string]: unknown;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const T = Tag as "div";

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const targets = y
        ? [el]
        : gsap.utils.toArray<HTMLElement>("[data-reveal-target]", el);
      if (!targets.length) return;

      if (reduced) {
        gsap.set(targets, { y: 0, autoAlpha: 1 });
        return;
      }

      if (y) gsap.set(targets, { y: 28, autoAlpha: 0 });

      gsap.to(targets, {
        y: 0,
        autoAlpha: 1,
        duration: 1.1,
        delay,
        ease: "power4.out",
        stagger: 0.07,
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          once,
        },
      });
    },
    { scope: ref }
  );

  return (
    <T ref={ref} className={className} {...rest}>
      {children}
    </T>
  );
}
