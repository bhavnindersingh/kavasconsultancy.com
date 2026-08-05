import type { Metadata } from "next";
import Link from "next/link";
import { CASES } from "@/lib/cases";
import Poster from "@/components/Poster";

export const metadata: Metadata = {
  title: "Case Studies — Kavas",
  description: "Selected engagements. Every one ends in software the client owns.",
};

/* Case Studies index — mirrors Collins /case-studies: dark cocoa
   ground, poster-wall collage in alternating centred rows, cards
   bleeding toward the edges, no captions (name chip on hover). */

export default function WorkPage() {
  return (
    <div
      className="on-dark"
      style={{ background: "var(--color-cocoa)" }}
    >
      <div className="work-head inset pt-[calc(var(--header-h)+9vh)] pb-6 text-center">
        <p className="label">Case Studies</p>
        <h1 className="serif mt-3" style={{ fontSize: "var(--fs-hero)" }}>
          Work they own outright.
        </h1>
        <p className="meta mt-4">
          1 real engagement · {CASES.length - 1} drafts to replace before
          launch (lib/cases.ts)
        </p>
      </div>

      <div className="work-collage pt-16 pb-24">
        {/* row 1 — three posters, varied scale, vertically centred */}
        <div className="collage-row">
          <Poster cs={CASES[0]} width="clamp(170px, 21vw, 330px)" aspect="3/4" />
          <Poster cs={CASES[1]} width="clamp(150px, 18vw, 280px)" aspect="4/5" />
          <Poster cs={CASES[2]} width="clamp(190px, 24vw, 360px)" aspect="1/1.05" />
        </div>

        {/* row 2 — two posters + open slot */}
        <div className="collage-row">
          <Poster cs={CASES[3]} width="clamp(160px, 19vw, 300px)" aspect="10/14" />
          <Poster cs={CASES[4]} width="clamp(180px, 22vw, 340px)" aspect="4/5" />
          <Link
            href="/contact"
            className="poster poster--ghost"
            style={{
              width: "clamp(150px, 17vw, 260px)",
              aspectRatio: "3/4",
            }}
          >
            <span
              className="serif on-dark"
              style={{ fontSize: 18, opacity: 0.75, padding: 16 }}
            >
              Your project here →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
