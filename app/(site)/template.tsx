"use client";

import * as React from "react";

/**
 * Route transition — the incoming page slides up and covers the
 * outgoing one (which recedes and dims beneath it), the same
 * "sheet over the page" language as the case-study story overlay.
 *
 * Driven by React's <ViewTransition> + the browser View Transitions API,
 * so the old page stays painted while the new one animates on top.
 * Motion is defined in globals.css (::view-transition-old/new(root)).
 * Browsers without support simply render the new page instantly.
 */
const ViewTransition = (
  React as unknown as {
    ViewTransition?: React.ComponentType<{
      children: React.ReactNode;
      enter?: string;
      exit?: string;
      default?: string;
    }>;
  }
).ViewTransition;

export default function Template({ children }: { children: React.ReactNode }) {
  if (!ViewTransition) return <>{children}</>;
  return (
    // single wrapper element => one transition group, so the page
    // moves as one sheet rather than per-section
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className="route-sheet">{children}</div>
    </ViewTransition>
  );
}
