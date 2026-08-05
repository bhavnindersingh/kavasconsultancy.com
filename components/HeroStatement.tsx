"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal, { Word } from "@/components/Reveal";

/**
 * Hero statement whose last word cycles on its own.
 *
 * "Own your advantage." → software. → models. → data. → roadmap.
 *
 * The sentence reads true whichever word lands, so the animation is also
 * the positioning: what a client walks away owning. It runs by itself at
 * a reading pace, quickens while hovered, and pauses when the hero is
 * off-screen or the tab is hidden. Static for reduced-motion.
 */
const PACE = 2600; // idle pace, ms per word
const PACE_HOVER = 1200; // quickened while hovered
export default function HeroStatement({
  line,
  cycle,
}: {
  line: string;
  cycle: string[];
}) {
  const words = line.split(" ");
  const lead = words.slice(0, -1); // "Own your"
  const [i, setI] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);

  // motion preference, read at render (no setState-in-effect)
  const canCycle = useSyncExternalStore(
    () => () => {},
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );

  useEffect(() => {
    if (!canCycle) return;
    const host = hostRef.current;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let onScreen = true;

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    // self-scheduling so the pace can change between ticks
    const tick = () => {
      if (document.hidden || !onScreen) {
        timer = setTimeout(tick, PACE);
        return;
      }
      setI((n) => (n + 1) % cycle.length);
      timer = setTimeout(tick, hovering.current ? PACE_HOVER : PACE);
    };
    timer = setTimeout(tick, PACE);

    const io = host
      ? new IntersectionObserver(([e]) => {
          onScreen = e.isIntersecting;
        })
      : null;
    if (io && host) io.observe(host);

    const onVis = () => {
      if (!document.hidden && !timer) timer = setTimeout(tick, PACE);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clear();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [canCycle, cycle.length]);

  return (
    // wrapper carries the observer ref — passing a ref through to Reveal
    // would clobber the one its own reveal animation depends on
    <div ref={hostRef} className="hero-host">
      <Reveal
        as="h1"
        className="hero-h hero-statement"
        // hovering quickens the cycle; it never stops entirely
        {...{
          onMouseEnter: () => (hovering.current = true),
          onMouseLeave: () => (hovering.current = false),
        }}
      >
      {lead.map((w, n) => (
        <span key={n}>
          <Word>{w}</Word>{" "}
        </span>
      ))}
      {/* the slot tweens its width so the centred line stays balanced
          whichever word is showing */}
      <motion.span
        layout
        className="hero-cycle"
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={cycle[i]}
            className="hero-cycle__word"
            initial={{ y: "88%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-88%", opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {cycle[i]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      </Reveal>
    </div>
  );
}
