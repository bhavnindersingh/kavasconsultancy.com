"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Collins "Read the full story" overlay. The pill lives wherever this
 * component is placed; the story slides up as a sheet, leaving a small
 * clickable gap at the top while the page recedes behind it.
 */
export default function StoryOverlay({
  lede,
  story,
}: {
  lede: string;
  story: string[];
}) {
  const [open, setOpen] = useState(false);
  // client-only flag for the portal (no setState-in-effect)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const root = document.documentElement;
    window.addEventListener("keydown", onKey);
    root.style.overflow = "hidden";
    root.classList.add("story-open"); // scales the page back behind the sheet
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = "";
      root.classList.remove("story-open");
    };
  }, [open]);

  return (
    <>
      <button
        className="pill pill--outline story-pill"
        onClick={() => setOpen(true)}
      >
        Read the full story
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {/* corner brackets — expand outward on hover */}
          <path className="c1" d="M10 2.5h3.5V6" />
          <path className="c2" d="M6 13.5H2.5V10" />
        </svg>
      </button>

      {/* portal to <body>: the page scales while open, and a transformed
          ancestor would otherwise capture position:fixed */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="story-wrap"
                className="fixed inset-0 z-[95]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* dimmed page behind — the top gap is clickable to dismiss */}
                <div className="story-backdrop" aria-hidden />
                <button
                  className="story-gap"
                  onClick={() => setOpen(false)}
                  aria-label="Close story and return"
                />

                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Full case story"
                  className="story-sheet"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    className="story-close"
                    onClick={() => setOpen(false)}
                    aria-label="Close story"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <path d="M3 3l10 10M13 3L3 13" />
                    </svg>
                  </button>

                  <div className="mx-auto max-w-[620px] px-6 py-[14vh]">
                    <p className="lede">{lede}</p>
                    <div className="prose-ed mt-12">
                      {story.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                    <p className="mt-14">
                      <span className="todo-chip">
                        Template slot — replace story paragraphs in lib/cases.ts
                      </span>
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
