import type { Metadata } from "next";
import { STUDIO } from "@/lib/content";
import Reveal, { Word } from "@/components/Reveal";
import ProcessSteps from "@/components/ProcessSteps";

export const metadata: Metadata = {
  title: "Studio — Kavas",
  description: "A small team, end to end.",
};

/* Studio — dark cocoa ground, generous vertical rhythm:
   centred intro → the people → what we believe → how we work
   (scroll-animated steps). */

const TEAM_TINTS = ["b", "e", "d", "a", "c", "b"] as const;

export default function StudioPage() {
  return (
    <div className="on-dark" style={{ background: "var(--color-cocoa)" }}>
      {/* intro */}
      <div className="inset pt-[calc(var(--header-h)+14vh)] pb-[16vh] text-center">
        <p className="label">{STUDIO.heroLabel}</p>
        <Reveal as="h1" className="hero-h mx-auto mt-6 max-w-[12em]">
          {STUDIO.hero.split(" ").map((w, i) => (
            <span key={i}>
              <Word>{w}</Word>{" "}
            </span>
          ))}
        </Reveal>
        <p className="body-text mx-auto mt-10">{STUDIO.intro}</p>
      </div>

      {/* the people */}
      <section className="inset pb-[18vh]">
        <p className="label mb-14">{STUDIO.teamLabel}</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-3">
          {STUDIO.team.map((t, i) => (
            <div key={i} className="person">
              <div className="person__img">
                <div
                  className={`tint tint--${TEAM_TINTS[i]}`}
                  style={{ aspectRatio: "5/6" }}
                >
                  <span style={{ fontSize: 15, opacity: 0.4 }}>
                    portrait {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>
              <p>{t.name}</p>
              <p className="meta">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* what we believe */}
      <section className="inset pb-[18vh]">
        <div className="grid gap-14 md:grid-cols-[minmax(0,24fr)_minmax(0,76fr)]">
          <p className="label">What We Believe</p>
          <div className="grid gap-x-16 gap-y-16 md:grid-cols-2">
            {STUDIO.values.map((v) => (
              <Reveal y key={v.name}>
                <h3 className="serif text-[22px] leading-tight">{v.name}</h3>
                <p className="body-text mt-4" style={{ fontSize: 14 }}>
                  {v.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* how we work — animated steps */}
      <section className="inset pb-[20vh]">
        <div className="grid gap-14 md:grid-cols-[minmax(0,24fr)_minmax(0,76fr)]">
          <p className="label md:sticky md:top-[calc(var(--header-h)+40px)] md:self-start">
            {STUDIO.processLabel}
          </p>
          <ProcessSteps steps={STUDIO.process} />
        </div>
      </section>
    </div>
  );
}
