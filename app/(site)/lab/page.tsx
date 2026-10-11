import type { Metadata } from "next";
import Link from "next/link";
import { LAB } from "@/lib/lab";
import { LABPAGE } from "@/lib/content";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Lab — Kavas",
  description: "Experiments, benchmarks and small tools from the studio.",
};

/* Lab — Collins' Collaborations grid: heading + dek, then image cards
   captioned with the kind and title underneath. */

const TINTS = ["b", "e", "c", "a", "d"] as const;

export default function LabPage() {
  return (
    <div className="inset pt-[calc(var(--header-h)+10vh)] pb-[var(--pad-section)]">
      <h1 className="section-h">{LABPAGE.title}</h1>
      <p className="meta mt-3 max-w-[34em]">{LABPAGE.dek}</p>

      <div className="notes-grid mt-14">
        {LAB.map((e, i) => (
          <Reveal y key={e.slug} delay={(i % 3) * 0.06}>
            <Link href={`/lab/${e.slug}`} className="note-card">
              <div
                className={`note-card__art tint tint--${TINTS[i % TINTS.length]}`}
              >
                <span style={{ fontSize: 14, opacity: 0.45 }}>
                  Lab image {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="meta mt-3">{e.kind}</p>
              <p className="note-card__title" style={{ marginTop: 4 }}>
                {e.title}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
