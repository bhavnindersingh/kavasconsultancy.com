import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedSection from '@/components/ui/AnimatedSection';
import Placeholder from '@/components/ui/Placeholder';
import CtaBand from '@/components/ui/CtaBand';
import { CASE_STUDIES, getCaseStudy, CTA_CASE } from '@/lib/content';

export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCaseStudy(slug);
  if (!c) return { title: 'Case Study — Kavas Consultancy' };
  return {
    title: `${c.title} — Kavas Consultancy`,
    description: c.oneLiner,
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCaseStudy(slug);
  if (!c) notFound();

  const index = CASE_STUDIES.findIndex((x) => x.id === c.id);
  const next = CASE_STUDIES[(index + 1) % CASE_STUDIES.length];

  return (
    <>
      <Navbar />
      <main>
        {/* ── Header ───────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1000px] px-6 pb-12 pt-[68px] sm:px-10">
          <AnimatedSection>
            <Link
              href="/work"
              className="font-mono text-[13.5px] text-[#6B645A] transition-colors hover:text-terracotta"
            >
              ← All work
            </Link>
            <div className="mb-5 mt-7 font-mono text-xs uppercase tracking-[0.12em] text-clay">
              {c.discipline} · {c.sector} · {c.year}
            </div>
            <h1 className="max-w-[20ch] font-serif text-[clamp(38px,5vw,68px)] font-normal leading-[1.03] tracking-[-0.018em]">
              {c.title}
            </h1>
            <p className="mt-6 text-[20px] leading-[1.55] text-muted">
              {c.oneLiner}
            </p>
          </AnimatedSection>
        </section>

        {/* ── Hero image ───────────────────────────────────────── */}
        <section className="mx-auto max-w-[1240px] px-6 sm:px-10">
          <AnimatedSection>
            <Placeholder className="h-[480px] rounded-[14px] border border-ink/12" />
          </AnimatedSection>
        </section>

        {/* ── Body ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1100px] px-6 py-[88px] sm:px-10">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[0.78fr_1.22fr]">
            {/* Sidebar */}
            <aside className="lg:sticky lg:top-[104px] lg:self-start">
              <div className="mb-6 font-mono text-[11.5px] uppercase tracking-[0.12em] text-clay">
                At a glance
              </div>
              <div className="flex flex-col gap-[22px]">
                <div>
                  <div className="mb-1 text-[12.5px] text-[#8A8378]">Engagement</div>
                  <div className="text-[15px] leading-[1.45] text-[#2A271F]">
                    {c.role}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-[12.5px] text-[#8A8378]">Timeline</div>
                  <div className="text-[15px] text-[#2A271F]">{c.duration}</div>
                </div>
                <div>
                  <div className="mb-2.5 text-[12.5px] text-[#8A8378]">Services</div>
                  <div className="flex flex-wrap gap-[7px]">
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-ink/[0.18] px-2.5 py-1 font-mono text-[11px] text-[#3C382F]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2.5 text-[12.5px] text-[#8A8378]">Stack</div>
                  <div className="flex flex-wrap gap-[7px]">
                    {c.stack.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-ink/5 px-2.5 py-1 font-mono text-[11px] text-[#6B645A]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Narrative */}
            <div>
              <AnimatedSection className="mb-[52px]">
                <div className="mb-[18px] font-mono text-[11.5px] uppercase tracking-[0.12em] text-clay">
                  The Challenge
                </div>
                <p className="font-serif text-[clamp(22px,2.4vw,28px)] font-normal leading-[1.42] tracking-[-0.01em] text-[#23201A]">
                  {c.challenge}
                </p>
              </AnimatedSection>

              <AnimatedSection>
                <div className="mb-6 font-mono text-[11.5px] uppercase tracking-[0.12em] text-clay">
                  Our Approach
                </div>
                <div className="flex flex-col">
                  {c.approach.map((a, i) => (
                    <div
                      key={a.t}
                      className="grid grid-cols-[auto_1fr] gap-6 border-t border-ink/14 py-[26px]"
                    >
                      <span className="font-mono text-[13px] text-terracotta">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className="mb-2.5 text-[19px] font-medium tracking-[-0.01em]">
                          {a.t}
                        </h3>
                        <p className="text-[15.5px] leading-[1.6] text-muted">
                          {a.d}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* ── Outcomes ─────────────────────────────────────────── */}
        <section className="bg-dark text-light">
          <div className="mx-auto max-w-[1100px] px-6 py-[84px] sm:px-10">
            <div className="mb-10 font-mono text-[11.5px] uppercase tracking-[0.12em] text-sand">
              Outcomes
            </div>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {c.outcomes.map((o) => (
                <AnimatedSection key={o.l} className="border-t-2 border-terracotta-light pt-5">
                  <div className="font-serif text-[clamp(34px,4vw,50px)] font-normal leading-none tracking-[-0.015em]">
                    {o.k}
                  </div>
                  <div className="mt-3.5 text-[15px] leading-[1.5] text-light/[0.74]">
                    {o.l}
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── Gallery ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1240px] px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Placeholder className="h-[340px] rounded-xl border border-ink/12" />
            <Placeholder className="h-[340px] rounded-xl border border-ink/12" />
          </div>
        </section>

        {/* ── Quote ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[920px] px-6 pb-24 pt-[72px] text-center sm:px-10">
          <AnimatedSection>
            <div className="mb-3 font-serif text-[38px] leading-none text-terracotta">
              &ldquo;
            </div>
            <blockquote className="font-serif text-[clamp(22px,2.8vw,32px)] font-normal italic leading-[1.4] tracking-[-0.01em] text-[#23201A]">
              {c.quote.text}
            </blockquote>
            <div className="mt-7 text-[14.5px] font-medium">{c.quote.name}</div>
            <div className="mt-[3px] text-[13.5px] text-faint">{c.quote.role}</div>
          </AnimatedSection>
        </section>

        {/* ── Next case study ──────────────────────────────────── */}
        <Link href={`/work/${next.id}`} className="block border-t border-ink/12">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-12 transition-colors hover:bg-cream-alt sm:px-10">
            <div>
              <div className="mb-2.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-clay">
                Next case study
              </div>
              <div className="font-serif text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.01em]">
                {next.title}
              </div>
            </div>
            <span className="shrink-0 font-mono text-2xl text-terracotta">→</span>
          </div>
        </Link>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <CtaBand headline={CTA_CASE.headline} buttonLabel={CTA_CASE.button} />
      </main>
      <Footer />
    </>
  );
}
