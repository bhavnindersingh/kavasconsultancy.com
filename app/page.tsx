import Link from "next/link";
import Image from "next/image";
import { HOME, PROGRAMS, PROGRAMS_PAGE } from "@/lib/content";
import { CASES } from "@/lib/cases";
import Reveal, { Word } from "@/components/Reveal";
import HeroStatement from "@/components/HeroStatement";
import HeroGlitch from "@/components/HeroGlitch";
import GlideRows from "@/components/GlideRows";
import TintSection from "@/components/TintSection";
import ScrollGrow from "@/components/ScrollGrow";
import HeroReel from "@/components/HeroReel";
import Poster from "@/components/Poster";

/* Home — mirrors wearecollins.com section-for-section:
   centred hero → media deck → What We Do → Case Studies
   filmstrip → full-bleed Notes band → dark footer (in layout). */

/* sized so ~3.5 posters show before the right edge (cut = "scroll me") */
const POSTER_WIDTHS = ["23vw", "22vw", "24vw", "23vw", "22vw"];
const POSTER_ASPECTS = ["3/4", "4/5", "1/1.05", "10/16", "4/5"];

export default function Home() {
  return (
    <>
      {/* ————— Hero: calm centred serif statement ————— */}
      <section className="wrap flex min-h-[72svh] flex-col items-center justify-center pt-[var(--header-h)] text-center">
        {HOME.heroMode === "glitch" ? (
          <HeroGlitch line={HOME.hero} />
        ) : (
          <HeroStatement line={HOME.hero} cycle={HOME.heroCycle} />
        )}
        <Reveal y delay={0.25}>
          <p className="meta mt-6 max-w-[26em]">{HOME.heroDek}</p>
        </Reveal>
      </section>

      {/* ————— Media deck: the showreel ————— */}
      <section className="pt-6">
        <ScrollGrow from={0.78} wipe>
          <div className="deck">
            <div className="deck__front">
              <HeroReel />
            </div>
          </div>
        </ScrollGrow>
      </section>

      {/* ————— What We Do ————— */}
      <section className="inset section">
        <p className="label mb-4">{HOME.programsLabel}</p>
        <Reveal as="h2" className="thesis max-w-[17em]">
          {HOME.programsThesis.split(" ").map((w, i) => (
            <span key={i}>
              <Word>{w}</Word>{" "}
            </span>
          ))}
        </Reveal>
        <p className="meta mt-7 max-w-[34em]">{PROGRAMS_PAGE.makes}</p>
        <Reveal y delay={0.1}>
          <Link href="/what-we-do" className="pill mt-9">
            {HOME.programsCta}
          </Link>
        </Reveal>

        {/* All five, each landing on the section that explains it —
            the row is a question the reader recognises, not a pitch. */}
        <div className="mt-14">
          <GlideRows
            items={PROGRAMS.map((p) => ({
              name: p.name,
              sub: p.when,
              href: `/what-we-do#${p.slug}`,
            }))}
          />
        </div>
      </section>

      {/* ————— Case Studies: thesis + poster filmstrip ————— */}
      <TintSection
        color="#1c0e04"
        darkContent
        persistBelow
        className="section pt-0"
      >
        <div className="inset">
          <p className="label mb-4">{HOME.casesLabel}</p>
          <Reveal as="h2" className="thesis max-w-[15em]">
            {HOME.casesThesis.split(" ").map((w, i) => (
              <span key={i}>
                <Word>{w}</Word>{" "}
              </span>
            ))}
          </Reveal>
          <Reveal y delay={0.1}>
            <Link href="/work" className="pill mt-7">
              {HOME.casesCta}
            </Link>
          </Reveal>
        </div>

        <div className="strip strip--end strip--bar mt-14">
          {CASES.map((cs, i) => (
            <Poster
              key={cs.slug}
              cs={cs}
              width={`clamp(200px, ${POSTER_WIDTHS[i]}, 380px)`}
              aspect={POSTER_ASPECTS[i]}
            />
          ))}
          <Link
            href="/contact"
            className="poster poster--ghost"
            style={{
              width: "clamp(180px, 22vw, 320px)",
              aspectRatio: "4/5",
            }}
          >
            <span className="ghost-label">{HOME.casesMore}</span>
          </Link>
        </div>
      </TintSection>

      {/* ————— Lab: full-bleed image banner, same wipe as hero ————— */}
      <ScrollGrow from={0.78} wipe radiusTo={0}>
        <Link href="/lab" className="band block no-underline">
          <Image
            src="/lab/studio.webp"
            alt={HOME.labImageAlt}
            fill
            sizes="100vw"
            className="band__img"
          />
          {/* the photo is bright; the scrim is what keeps the cream
              type legible over it — see .band__scrim in globals.css */}
          <span className="band__scrim" aria-hidden />
          <div className="inset relative z-10 flex min-h-[78svh] flex-col justify-end pb-16 on-dark">
            <p className="label">{HOME.labLabel}</p>
            <p className="serif mt-2" style={{ fontSize: "var(--fs-thesis)" }}>
              {HOME.labLine}
            </p>
            <span className="pill pill--white mt-6 w-fit">{HOME.labCta}</span>
          </div>
        </Link>
      </ScrollGrow>
    </>
  );
}
