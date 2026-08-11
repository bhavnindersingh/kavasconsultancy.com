import type { Metadata } from "next";
import Link from "next/link";
import { APPLIED_AI } from "@/lib/content";
import { LAB } from "@/lib/lab";
import Reveal, { Word } from "@/components/Reveal";
import ProcessSteps from "@/components/ProcessSteps";
import Glyph from "@/components/Glyph";

export const metadata: Metadata = {
  title: "Applied AI & LLMs — Kavas",
  description:
    "Language models trained on your business — copilots, retrieval and agents, measured before they ship and running on infrastructure you own.",
};

/* Applied AI — the one engagement with a page of its own.
   An argument in four moves: how we work with models → what
   "measured" means → how a build runs → what we can do,
   ending in the Lab, where the evidence actually is. */

const PROOF_TINTS = ["b", "e", "c"] as const;

export default function AppliedAIPage() {
  const proof = APPLIED_AI.proofSlugs
    .map((slug) => LAB.find((e) => e.slug === slug))
    .filter((e): e is (typeof LAB)[number] => Boolean(e));

  return (
    <>
      {/* ————— hero ————— */}
      <section className="inset pt-[calc(var(--header-h)+16vh)] pb-[14vh]">
        <p className="label">{APPLIED_AI.label}</p>
        <Reveal as="h1" className="hero-h mt-6 max-w-[13em]">
          {APPLIED_AI.hero.split(" ").map((w, i) => (
            <span key={i}>
              <Word>{w}</Word>{" "}
            </span>
          ))}
        </Reveal>
        <p className="body-text mt-10 max-w-[30em]">{APPLIED_AI.dek}</p>
        <Reveal y delay={0.1}>
          <Link href="/contact?program=applied-ai" className="pill mt-9">
            {APPLIED_AI.cta}
          </Link>
        </Reveal>
      </section>

      {/* ————— principles ————— */}
      <section className="inset section">
        <div className="grid gap-14 md:grid-cols-[minmax(0,24fr)_minmax(0,76fr)]">
          <p className="label md:sticky md:top-[calc(var(--header-h)+40px)] md:self-start">
            {APPLIED_AI.principlesLabel}
          </p>
          <div>
            <Reveal as="h2" className="thesis max-w-[13em]">
              {APPLIED_AI.principlesHead.split(" ").map((w, i) => (
                <span key={i}>
                  <Word>{w}</Word>{" "}
                </span>
              ))}
            </Reveal>
            <div className="mt-16 grid gap-x-16 gap-y-14 md:grid-cols-2">
              {APPLIED_AI.principles.map((p) => (
                <Reveal y key={p.name}>
                  <h3 className="serif text-[22px] leading-tight">{p.name}</h3>
                  <p className="body-text mt-4" style={{ fontSize: 14 }}>
                    {p.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ————— evaluation: the scoreboard, honestly labelled ————— */}
      <section className="section pt-0">
        <div className="inset">
          <p className="label mb-4">{APPLIED_AI.evalLabel}</p>
          <Reveal as="h2" className="thesis max-w-[14em]">
            {APPLIED_AI.evalHead.split(" ").map((w, i) => (
              <span key={i}>
                <Word>{w}</Word>{" "}
              </span>
            ))}
          </Reveal>
          <p className="body-text mt-8 max-w-[30em]">{APPLIED_AI.evalBody}</p>
        </div>

        <div className="strip mt-14" style={{ paddingLeft: "var(--inset)" }}>
          {APPLIED_AI.evalMetrics.map((m, i) => (
            <Reveal y key={m.title} delay={i * 0.06}>
              <div className="icard">
                <Glyph figure={m.figure} />
                <div>
                  <p className="icard__title">{m.title}</p>
                  <p className="icard__sub">{m.sub}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="inset mt-8">
          <span className="meta max-w-[34em] inline-block">
            {APPLIED_AI.evalNote}
          </span>
        </p>
      </section>

      {/* ————— lifecycle ————— */}
      <section className="band-white">
        <div className="inset section">
          <div className="grid gap-14 md:grid-cols-[minmax(0,24fr)_minmax(0,76fr)]">
            <p className="label md:sticky md:top-[calc(var(--header-h)+40px)] md:self-start">
              {APPLIED_AI.lifecycleLabel}
            </p>
            <ProcessSteps steps={APPLIED_AI.lifecycle} />
          </div>
        </div>
      </section>

      {/* ————— capabilities ————— */}
      <section className="inset section">
        <div className="grid gap-14 md:grid-cols-[minmax(0,24fr)_minmax(0,76fr)]">
          <p className="label">{APPLIED_AI.capabilitiesLabel}</p>
          <div className="grid gap-x-16 gap-y-12 md:grid-cols-2">
            {APPLIED_AI.capabilities.map((c) => (
              <Reveal y key={c.name}>
                <h3 className="serif text-[20px] leading-tight">{c.name}</h3>
                <p className="body-text mt-3" style={{ fontSize: 14 }}>
                  {c.body}
                </p>
                <p className="meta mt-4" style={{ fontSize: 13 }}>
                  {c.stack}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ————— proof: straight into the Lab ————— */}
      <section
        style={{ background: "var(--color-cocoa)" }}
        className="on-dark"
      >
        <div className="inset section">
          <p className="label mb-4">{APPLIED_AI.proofLabel}</p>
          <Reveal as="h2" className="thesis max-w-[14em]">
            {APPLIED_AI.proofHead.split(" ").map((w, i) => (
              <span key={i}>
                <Word>{w}</Word>{" "}
              </span>
            ))}
          </Reveal>

          <div className="notes-grid mt-14">
            {proof.map((e, i) => (
              <Reveal y key={e.slug} delay={i * 0.06}>
                <Link href={`/lab/${e.slug}`} className="note-card">
                  <div
                    className={`note-card__art tint tint--${PROOF_TINTS[i % PROOF_TINTS.length]}`}
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

          <Link href="/lab" className="pill pill--white mt-12">
            {APPLIED_AI.proofCta}
          </Link>
        </div>
      </section>
    </>
  );
}
