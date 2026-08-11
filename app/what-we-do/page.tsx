import type { Metadata } from "next";
import Link from "next/link";
import { PROGRAMS, PROGRAMS_PAGE, START } from "@/lib/content";
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
          <p className="meta mt-7 max-w-[34em]">{PROGRAMS_PAGE.makes}</p>
        </div>
      </section>

      {/* ————— impact ghost list ————— */}
      <section className="inset section">
        <div className="grid gap-10 md:grid-cols-[minmax(0,26fr)_minmax(0,74fr)] md:items-center">
          <p className="label">{PROGRAMS_PAGE.impactLabel}</p>
          <ImpactList lines={PROGRAMS_PAGE.impact} />
        </div>
      </section>

      {/* ————— white band: the five, as an index into the detail below.
             Rows show the reader's situation, not our vocabulary. ————— */}
      <section className="band-white">
        <div className="inset section">
          <h2 className="section-h mb-12">What We Do</h2>
          <GlideRows
            items={PROGRAMS.map((p) => ({
              name: p.name,
              sub: p.when,
              href: `#${p.slug}`,
            }))}
          />
        </div>
      </section>

      {/* ————— the five, explained. Every row above lands here, so
             nobody is asked to fill in a form to find out what a
             thing is. ————— */}
      <section className="inset section">
        {PROGRAMS.map((p) => (
          <div
            key={p.slug}
            id={p.slug}
            className="border-t py-14 md:py-20"
            style={{
              borderColor: "var(--color-ghost)",
              scrollMarginTop: "calc(var(--header-h) + 40px)",
            }}
          >
            <div className="grid gap-8 md:grid-cols-[minmax(0,26fr)_minmax(0,74fr)]">
              <div>
                <p className="label">{p.name}</p>
                <p className="meta mt-2 max-w-[18em]">{p.when}</p>
              </div>
              <div>
                <Reveal as="h3" className="serif max-w-[13em] text-[clamp(24px,2.1vw,34px)] leading-[1.1]">
                  {p.promise.split(" ").map((w, i) => (
                    <span key={i}>
                      <Word>{w}</Word>{" "}
                    </span>
                  ))}
                </Reveal>
                <p className="body-text mt-6 max-w-[32em]">{p.body}</p>
                <p className="meta mt-7" style={{ fontSize: 13 }}>
                  {p.makes}
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3">
                  {p.more && (
                    <Link href={p.more.href} className="footer-link text-[15px]">
                      {p.more.label} →
                    </Link>
                  )}
                  <Link
                    href={`/contact?program=${p.slug}`}
                    className="footer-link text-[15px]"
                    style={{ color: "var(--color-mute)" }}
                  >
                    Talk to us about this →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ————— where it starts: the Shape phase ————— */}
      <section className="inset section">
        <div className="grid gap-10 md:grid-cols-[minmax(0,26fr)_minmax(0,74fr)]">
          <p className="label">{START.label}</p>
          <div>
            <Reveal as="h2" className="thesis max-w-[14em]">
              {START.head.split(" ").map((w, i) => (
                <span key={i}>
                  <Word>{w}</Word>{" "}
                </span>
              ))}
            </Reveal>
            <p className="body-text mt-8 max-w-[30em]">{START.body}</p>
            <ul className="mt-10 max-w-[30em]">
              {START.outcomes.map((o) => (
                <li
                  key={o}
                  className="meta border-t py-4"
                  style={{ borderColor: "var(--color-ghost)" }}
                >
                  {o}
                </li>
              ))}
            </ul>
            <p className="meta mt-8 max-w-[30em]">{START.note}</p>
            <Reveal y delay={0.1}>
              <Link href="/contact" className="pill mt-9">
                {START.cta}
              </Link>
            </Reveal>
          </div>
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
