import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CASES, getCase, nextCase } from "@/lib/cases";
import Placeholder from "@/components/Placeholder";
import StoryOverlay from "@/components/StoryOverlay";
import LedeReveal from "@/components/LedeReveal";
import Poster from "@/components/Poster";
import Glyph from "@/components/Glyph";
import Reveal from "@/components/Reveal";

export function generateStaticParams() {
  return CASES.map((c) => ({ slug: c.slug }));
}

/* Case page — mirrors Collins /case-studies/bose:
   "Case Study" label → centred client + dek → media filmstrip →
   meta rail + ink-reveal lede + "Read the full story" →
   white "system" panel → Impact card strip → next-case teaser. */

export default async function CasePage(props: PageProps<"/work/[slug]">) {
  const { slug } = await props.params;
  const cs = getCase(slug);
  if (!cs) notFound();
  const next = nextCase(slug);

  return (
    <div className="pt-[calc(var(--header-h)+7vh)]">
      {/* hero — left-aligned to the shared content line */}
      <div className="inset">
        <p className="label">Case Study</p>
        <h1 className="serif mt-6" style={{ fontSize: "var(--fs-hero)" }}>
          {cs.client}
        </h1>
        <p className="meta mt-3 max-w-[36em]">{cs.dek}</p>
      </div>

      {/* media filmstrip — starts at the content line, bottom-aligned, bleeds right */}
      <div
        className="strip strip--media mt-12"
        style={{ paddingLeft: "var(--inset)" }}
      >
        {cs.media ? (
          cs.media.map((m, i) => (
            <div
              key={m.src}
              className="case-shot"
              style={{
                aspectRatio: m.ratio,
                width: i === 0 ? "min(56vw, 760px)" : "min(42vw, 560px)",
              }}
            >
              <Image
                src={m.src}
                alt={m.alt}
                fill
                sizes="(max-width: 700px) 78vw, 50vw"
                className="case-shot__img"
                priority={i === 0}
              />
            </div>
          ))
        ) : (
          <>
            <Placeholder
              label="Media 01 — wide, replace"
              ratio="16/10"
              dark={cs.tint === "b" || cs.tint === "d"}
              className="w-[min(52vw,700px)]"
              mark="01"
            />
            <Placeholder
              label="Media 02 — portrait"
              ratio="3/4"
              className="w-[min(20vw,270px)]"
              mark="02"
            />
            <Placeholder
              label="Media 03 — wide"
              ratio="16/9"
              dark
              className="w-[min(40vw,540px)]"
              mark="03"
            />
            <Placeholder
              label="Media 04 — square"
              ratio="1/1"
              className="w-[min(26vw,340px)]"
              mark="04"
            />
          </>
        )}
      </div>

      {/* meta rail + lede + story */}
      <section className="inset section">
        <div className="grid gap-12 md:grid-cols-[minmax(0,24fr)_minmax(0,76fr)]">
          <div className="flex flex-col gap-6">
            <div>
              <p className="label">Program</p>
              <p className="meta mt-1">{cs.program}</p>
            </div>
            <div>
              <p className="label">Industry</p>
              <p className="meta mt-1">{cs.industry}</p>
            </div>
            <div>
              <p className="label">Stage</p>
              <p className="meta mt-1">{cs.stage}</p>
            </div>
          </div>
          <div>
            <LedeReveal text={cs.lede} />
            <div className="mt-9">
              <StoryOverlay lede={cs.lede} story={cs.story} />
            </div>
          </div>
        </div>
      </section>

      {/* white panel — the system that shipped */}
      <section className="wrap pb-[var(--pad-section)]">
        <div className="panel mx-auto max-w-[1240px]">
          <h2 className="section-h">{cs.built.title}</h2>
          <p className="meta mx-auto mt-4 max-w-[420px]">{cs.built.body}</p>
          <div className="panel__stack">
            {cs.media ? (
              <>
                <div
                  className="case-shot absolute right-[2%] top-[22%] w-[56%]"
                  style={{ aspectRatio: "3/2", transform: "rotate(5deg)" }}
                >
                  <Image
                    src={cs.media[Math.min(2, cs.media.length - 1)].src}
                    alt={cs.media[Math.min(2, cs.media.length - 1)].alt}
                    fill
                    sizes="40vw"
                    className="case-shot__img"
                  />
                </div>
                <div
                  className="case-shot relative mx-auto w-[70%]"
                  style={{
                    aspectRatio: "3/2",
                    transform: "translateX(-8%) rotate(-4deg)",
                    boxShadow: "0 24px 60px rgba(20,7,0,0.18)",
                  }}
                >
                  <Image
                    src={cs.media[0].src}
                    alt={cs.media[0].alt}
                    fill
                    sizes="50vw"
                    className="case-shot__img"
                  />
                </div>
              </>
            ) : (
              <>
                <div
                  className="ph absolute right-[2%] top-[24%] w-[56%]"
                  style={{ aspectRatio: "16/10", transform: "rotate(5deg)" }}
                >
                  <span className="ph__mark serif">B</span>
                </div>
                <div
                  className={`ph relative mx-auto w-[70%] ${cs.tint === "b" || cs.tint === "d" ? "ph--dark" : ""}`}
                  style={{
                    aspectRatio: "16/10",
                    transform: "translateX(-8%) rotate(-4deg)",
                    boxShadow: "0 24px 60px rgba(20,7,0,0.18)",
                  }}
                >
                  <span className="ph__mark serif">A</span>
                  <span className="ph__tag">Product shots — replace</span>
                </div>
              </>
            )}
          </div>
          {cs.link ? (
            <a
              className="pill pill--outline"
              href={cs.link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {cs.link.label} ↗
            </a>
          ) : (
            <span className="pill pill--outline">Explore the system ↗</span>
          )}
        </div>
      </section>

      {/* impact cards */}
      <section className="pb-[var(--pad-section)]">
        <p className="section-h inset serif mb-8">Impact</p>
        <div className="strip" style={{ paddingLeft: "var(--inset)" }}>
          {cs.impact.map((m, i) => (
            <Reveal y key={i} delay={i * 0.06}>
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
        {!cs.media && (
          <p className="inset mt-6">
            <span className="todo-chip">
              Draft case — replace every figure with a number you can defend,
              and get the client&rsquo;s approval before publishing
            </span>
          </p>
        )}
      </section>

      {/* quote — only when there's a real, approved one */}
      {cs.quote && (
        <section className="inset pb-[var(--pad-section)]">
          <div className="grid gap-10 md:grid-cols-[minmax(0,24fr)_minmax(0,76fr)]">
            <p className="label">In their words</p>
            <div>
              <blockquote className="lede max-w-[20em]">
                “{cs.quote.text}”
              </blockquote>
              <p className="meta mt-5">{cs.quote.attribution}</p>
            </div>
          </div>
        </section>
      )}

      {/* next case teaser — centred single poster */}
      <section className="pb-[var(--pad-section)] text-center">
        <h2 className="section-h">Case Studies</h2>
        <p className="meta mt-2 mb-10">See others we’ve helped with this program</p>
        <div className="flex justify-center">
          <Poster cs={next} width="clamp(220px, 24vw, 340px)" />
        </div>
        <p className="meta mt-5">
          <Link
            href={`/work/${next.slug}`}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {next.client}
          </Link>
        </p>
      </section>
    </div>
  );
}
