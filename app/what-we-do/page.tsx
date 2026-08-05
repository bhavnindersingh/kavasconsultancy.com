import type { Metadata } from "next";
import { PROGRAMS, PROGRAMS_PAGE } from "@/lib/content";
import GlideRows from "@/components/GlideRows";
import ImpactList from "@/components/ImpactList";
import Scatter from "@/components/Scatter";
import Reveal, { Word } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "What We Do — Kavas",
  description:
    "Five ways we help businesses own the software they run on.",
};

/* What We Do — mirrors Collins /programs: scattered floating media
   around the thesis → impact ghost-list → white band with all
   rows → dark Capabilities band flowing into the footer. */

export default function WhatWeDoPage() {
  return (
    <>
      {/* ————— scatter hero ————— */}
      <section className="scatter pt-[calc(var(--header-h)+10vh)]">
        <Scatter />
        <div className="inset relative z-10 pt-[26svh]">
          <p className="label mb-3">{PROGRAMS_PAGE.label}</p>
          <Reveal as="h1" className="thesis max-w-[13em]">
            {PROGRAMS_PAGE.thesis.split(" ").map((w, i) => (
              <span key={i}>
                <Word>{w}</Word>{" "}
              </span>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ————— impact ghost list ————— */}
      <section className="inset section">
        <div className="grid gap-10 md:grid-cols-[minmax(0,26fr)_minmax(0,74fr)] md:items-center">
          <p className="label">{PROGRAMS_PAGE.impactLabel}</p>
          <ImpactList lines={PROGRAMS_PAGE.impact} />
        </div>
      </section>

      {/* ————— white band: all programs ————— */}
      <section className="band-white">
        <div className="inset section">
          <h2 className="section-h mb-12">What We Do</h2>
          <GlideRows
            items={PROGRAMS.map((p) => ({
              name: p.name,
              sub: p.promise,
              href: `/contact?program=${p.slug}`,
            }))}
          />
        </div>
      </section>

      {/* ————— dark capabilities band ————— */}
      <section style={{ background: "var(--color-cocoa)" }} className="on-dark">
        <div className="inset section">
          <div className="grid gap-10 md:grid-cols-[minmax(0,26fr)_minmax(0,74fr)]">
            <p className="label">{PROGRAMS_PAGE.capabilitiesLabel}</p>
            <div>
              <h2 className="section-h max-w-[18em]">
                {PROGRAMS_PAGE.capabilitiesHead}
              </h2>
              <div className="mt-8 max-w-[420px]">
                {PROGRAMS_PAGE.capabilitiesBody.map((p, i) => (
                  <p key={i} className="body-text" style={{ fontSize: 13.5 }}>
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
