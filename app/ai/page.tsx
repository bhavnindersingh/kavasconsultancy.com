import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedSection from '@/components/ui/AnimatedSection';
import Eyebrow from '@/components/ui/Eyebrow';
import Button from '@/components/ui/Button';
import WorkCard from '@/components/ui/WorkCard';
import CtaBand from '@/components/ui/CtaBand';
import EvalMockup from '@/components/ui/EvalMockup';
import { AI, CTA_AI } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Applied AI & LLMs — Kavas Consultancy',
  description:
    'Fine-tuned models, retrieval, and agents grounded in your data — measured before they ship and owned entirely by you.',
};

export default function AppliedAIPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1240px] px-6 pb-[84px] pt-[92px] sm:px-10">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <AnimatedSection>
                <Eyebrow bar className="mb-[34px]">
                  {AI.hero.eyebrow}
                </Eyebrow>
              </AnimatedSection>
              <AnimatedSection delay={0.05}>
                <h1 className="max-w-[16ch] font-serif text-[clamp(40px,5vw,70px)] font-normal leading-[1.03] tracking-[-0.018em]">
                  {AI.hero.headlineLead}{' '}
                  <span className="italic text-terracotta">
                    {AI.hero.headlineEmphasis}
                  </span>
                </h1>
              </AnimatedSection>
              <AnimatedSection delay={0.1}>
                <p className="mt-[30px] max-w-[52ch] text-[18.5px] leading-[1.62] text-muted">
                  {AI.hero.body}
                </p>
              </AnimatedSection>
              <AnimatedSection delay={0.15}>
                <div className="mt-[38px] flex flex-wrap gap-3.5">
                  <Button href="/contact" arrow>
                    {AI.hero.ctaPrimary}
                  </Button>
                  <Button href="#work" variant="outline">
                    {AI.hero.ctaSecondary}
                  </Button>
                </div>
              </AnimatedSection>
            </div>
            <AnimatedSection delay={0.1}>
              <EvalMockup evals={AI.hero.evals} />
            </AnimatedSection>
          </div>
        </section>

        {/* ── Principles ───────────────────────────────────────── */}
        <section className="border-y border-ink/10 bg-cream-alt">
          <div className="mx-auto max-w-[1200px] px-6 py-[116px] sm:px-10">
            <AnimatedSection className="mb-16 max-w-[640px]">
              <Eyebrow className="mb-[22px]">{AI.principlesEyebrow}</Eyebrow>
              <h2 className="font-serif text-[clamp(30px,4vw,52px)] font-normal leading-[1.05] tracking-[-0.018em]">
                {AI.principlesHeadline}
              </h2>
            </AnimatedSection>
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {AI.principles.map((p) => (
                <AnimatedSection key={p.n}>
                  <div className="mb-[18px] font-mono text-[12.5px] text-terracotta">
                    {p.n}
                  </div>
                  <h3 className="mb-[11px] font-serif text-[23px] font-normal tracking-[-0.01em]">
                    {p.t}
                  </h3>
                  <p className="text-[15px] leading-[1.62] text-muted">{p.d}</p>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── What we build ────────────────────────────────────── */}
        <section className="mx-auto max-w-[1200px] px-6 py-[120px] sm:px-10">
          <AnimatedSection className="mb-16 max-w-[640px]">
            <Eyebrow className="mb-[22px]">{AI.servicesEyebrow}</Eyebrow>
            <h2 className="font-serif text-[clamp(30px,4vw,52px)] font-normal leading-[1.05] tracking-[-0.018em]">
              {AI.servicesHeadline}
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 gap-px border border-ink/12 bg-ink/12 sm:grid-cols-2 lg:grid-cols-3">
            {AI.services.map((s) => (
              <AnimatedSection
                key={s.n}
                className="bg-cream p-8 transition-colors duration-300 hover:bg-cream-raised"
              >
                <div className="mb-6 font-mono text-[12.5px] text-terracotta">
                  {s.n}
                </div>
                <h3 className="mb-[11px] font-serif text-[23px] font-normal tracking-[-0.01em]">
                  {s.t}
                </h3>
                <p className="mb-[18px] text-[14.5px] leading-[1.6] text-muted">
                  {s.d}
                </p>
                <div className="font-mono text-[11.5px] tracking-[0.02em] text-[#8A8378]">
                  {s.tech}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </section>

        {/* ── Model training band ──────────────────────────────── */}
        <section className="bg-dark text-light">
          <div className="mx-auto max-w-[1200px] px-6 py-[120px] sm:px-10">
            <div className="grid gap-16 lg:grid-cols-2">
              <AnimatedSection>
                <Eyebrow tone="dark" className="mb-[22px]">
                  {AI.trainingBand.eyebrow}
                </Eyebrow>
                <h2 className="mb-6 font-serif text-[clamp(30px,4vw,48px)] font-normal leading-[1.06] tracking-[-0.018em]">
                  {AI.trainingBand.headline}
                </h2>
                <p className="mb-7 max-w-[48ch] text-[17px] leading-[1.64] text-light/[0.66]">
                  {AI.trainingBand.body}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {AI.trainingBand.techniques.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-light/22 px-3.5 py-2 font-mono text-[12.5px] text-[#E8E2D6]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.1}>
                <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-light/14 bg-light/12">
                  {AI.trainingBand.lifecycle.map((l) => (
                    <div
                      key={l.n}
                      className="grid grid-cols-[auto_1fr] items-baseline gap-[22px] bg-[#1E1A15] px-[26px] py-[22px]"
                    >
                      <span className="font-mono text-[12.5px] text-terracotta-light">
                        {l.n}
                      </span>
                      <div>
                        <div className="mb-[5px] text-base font-medium tracking-[-0.01em]">
                          {l.t}
                        </div>
                        <div className="text-sm leading-[1.55] text-light/60">
                          {l.d}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* ── AI case studies ──────────────────────────────────── */}
        <section id="work" className="mx-auto max-w-[1240px] px-6 py-[120px] sm:px-10">
          <AnimatedSection className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[620px]">
              <Eyebrow className="mb-[22px]">{AI.caseEyebrow}</Eyebrow>
              <h2 className="font-serif text-[clamp(30px,4vw,52px)] font-normal leading-[1.05] tracking-[-0.018em]">
                {AI.caseHeadline}
              </h2>
            </div>
            <Link
              href="/work"
              className="inline-flex items-center gap-2 pb-2 text-[14.5px] font-medium text-ink transition-colors hover:text-terracotta"
            >
              All case studies <span className="font-mono">→</span>
            </Link>
          </AnimatedSection>
          <div className="grid grid-cols-1 gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
            {AI.aiWork.map((w) => (
              <AnimatedSection key={w.id}>
                <WorkCard
                  href={`/work/${w.id}`}
                  label={w.label}
                  title={w.title}
                  oneLiner={w.oneLiner}
                />
              </AnimatedSection>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <CtaBand
          headline={CTA_AI.headline}
          body={CTA_AI.body}
          buttonLabel={CTA_AI.button}
        />
      </main>
      <Footer />
    </>
  );
}
