"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Item = { name: string; sub: string; href: string };

/**
 * Program rows with a single shared highlight frame that GLIDES
 * between rows on hover (no fade-out/fade-in break). Non-hovered
 * rows dim while the frame is out.
 */
export default function GlideRows({ items }: { items: Item[] }) {
  const gliderRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const wasHidden = useRef(true);

  const moveTo = (i: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    const row = e.currentTarget;
    const g = gliderRef.current;
    if (!g) return;
    // overshoot 2px each side so the row hairlines never show on the frame
    const top = `${row.offsetTop - 2}px`;
    const height = `${row.offsetHeight + 4}px`;
    if (wasHidden.current) {
      // first entry: place and show instantly, then glide on later moves
      g.style.transition = "none";
      g.style.top = top;
      g.style.height = height;
      void g.offsetHeight; // commit position before restoring transitions
      g.style.transition = "";
    } else {
      g.style.top = top;
      g.style.height = height;
    }
    wasHidden.current = false;
    setActive(i);
  };

  return (
    <div
      className="rows rows--glide"
      onMouseLeave={() => {
        setActive(null);
        wasHidden.current = true;
      }}
    >
      <div
        ref={gliderRef}
        className="glider"
        data-visible={active !== null}
        aria-hidden
      />
      {items.map((it, i) => (
        <Link
          key={it.name}
          href={it.href}
          className={`row ${active === i ? "is-on" : ""} ${
            active !== null && active !== i ? "is-dim" : ""
          }`}
          onMouseEnter={moveTo(i)}
        >
          <span className="row__name">{it.name}</span>
          <span className="row__sub">{it.sub}</span>
          <span className="row__arrow" aria-hidden>
            →
          </span>
        </Link>
      ))}
    </div>
  );
}
