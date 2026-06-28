import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedSection from '@/components/ui/AnimatedSection';
import Eyebrow from '@/components/ui/Eyebrow';
import Placeholder from '@/components/ui/Placeholder';
import CtaBand from '@/components/ui/CtaBand';
import { ABOUT, CTA_ABOUT } from '@/lib/content';

export const metadata: Metadata = {
  title: 'About — Kavas Consultancy',
  description:
    'Four engineers and two designers who build custom software — and the AI behind it — end to end, and hand it over in full.',
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1000px] px-6 pb-16 pt-[92px] sm:px-10">
          <AnimatedSection>
            <Eyebrow bar className="mb-[34px]">
              {ABOUT.hero.eyebrow}
            </Eyebrow>
            <h1 className="max-w-[18ch] font-serif text-[clamp(40px,5.2vw,72px)] font-normal leading-[1.02] tracking-[-0.018em]">
              {ABOUT.hero.headlineLead}{' '}
              <span className="italic text-terracotta">
                {ABOUT.hero.headlineEmphasis}
              </span>
            </h1>
            <p className="mt-7 max-w-[58ch] text-[19px] leading-[1.6] text-muted">
              {ABOUT.hero.body}
            </p>
          </AnimatedSection>
        </section>

        {/* ── Values ───────────────────────────────────────────── */}
        <section className="border-y border-ink/10 bg-cream-alt">
          <div className="mx-auto max-w-[1200px] px-6 py-[116px] sm:px-10">
            <AnimatedSection className="mb-[60px] max-w-[620px]">
              <Eyebrow className="mb-[22px]">{ABOUT.valuesEyebrow}</Eyebrow>
              <h2 className="font-serif text-[clamp(30px,4vw,52px)] font-normal leading-[1.05] tracking-[-0.018em]">
                {ABOUT.valuesHeadline}
              </h2>
            </AnimatedSection>
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {ABOUT.values.map((v) => (
                <AnimatedSection key={v.n}>
                  <div className="mb-[18px] font-mono text-[12.5px] text-terracotta">
                    {v.n}
                  </div>
                  <h3 className="mb-[11px] font-serif text-[24px] font-normal tracking-[-0.01em]">
                    {v.t}
                  </h3>
                  <p className="text-[15px] leading-[1.62] text-muted">{v.d}</p>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── Team ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1200px] px-6 py-[116px] sm:px-10">
          <AnimatedSection className="mb-[60px] grid items-end gap-10 lg:grid-cols-2">
            <div>
              <Eyebrow className="mb-[22px]">{ABOUT.teamEyebrow}</Eyebrow>
              <h2 className="max-w-[16ch] font-serif text-[clamp(30px,4vw,52px)] font-normal leading-[1.04] tracking-[-0.018em]">
                {ABOUT.teamHeadline}
              </h2>
            </div>
            <p className="max-w-[44ch] text-[16.5px] leading-[1.62] text-muted">
              {ABOUT.teamBody}
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-2 gap-x-9 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
            {ABOUT.team.map((m) => (
              <AnimatedSection key={m.id}>
                <Placeholder
                  label="Drop a photo"
                  className="mb-3.5 aspect-square rounded-[14px] border border-ink/12"
                />
                <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                  {m.tag}
                </div>
                <div className="mt-1.5 text-base font-medium tracking-[-0.01em]">
                  {m.name}
                </div>
                <div className="mt-0.5 text-[13.5px] text-faint">{m.role}</div>
              </AnimatedSection>
            ))}
          </div>
        </section>

        {/* ── Ownership band ───────────────────────────────────── */}
        <section className="bg-dark text-light">
          <div className="mx-auto max-w-[1000px] px-6 py-[104px] text-center sm:px-10">
            <AnimatedSection>
              <Eyebrow tone="dark" className="mb-5 inline-flex justify-center">
                {ABOUT.ownership.eyebrow}
              </Eyebrow>
              <h2 className="mx-auto max-w-[20ch] font-serif text-[clamp(30px,4vw,52px)] font-normal leading-[1.06] tracking-[-0.018em]">
                {ABOUT.ownership.headlineLead}{' '}
                <span className="italic text-terracotta-light">
                  {ABOUT.ownership.headlineEmphasis}
                </span>
              </h2>
              <p className="mx-auto mt-6 max-w-[52ch] text-[18px] leading-[1.62] text-light/[0.66]">
                {ABOUT.ownership.body}
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <CtaBand headline={CTA_ABOUT.headline} buttonLabel={CTA_ABOUT.button} />
      </main>
      <Footer />
    </>
  );
}
