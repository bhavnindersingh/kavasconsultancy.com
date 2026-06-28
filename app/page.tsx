import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedSection from '@/components/ui/AnimatedSection';
import Eyebrow from '@/components/ui/Eyebrow';
import Button from '@/components/ui/Button';
import Marquee from '@/components/ui/Marquee';
import WorkCard from '@/components/ui/WorkCard';
import CtaBand from '@/components/ui/CtaBand';
import EvalMockup from '@/components/ui/EvalMockup';
import DashboardMockup from '@/components/ui/DashboardMockup';
import { HOME, CTA_HOME, getCaseStudy } from '@/lib/content';

function shortDiscipline(d: string) {
  return d.replace('Applied AI & LLMs', 'Applied AI');
}

export default function Home() {
  const featured = HOME.featured
    .map((id) => getCaseStudy(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <>
      <Navbar />
      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1240px] px-6 pb-[84px] pt-[92px] sm:px-10">
          <div className="grid items-center gap-[68px] lg:grid-cols-2">
            <div>
              <AnimatedSection>
                <Eyebrow bar className="mb-[34px]">
                  {HOME.hero.eyebrow}
                </Eyebrow>
              </AnimatedSection>
              <AnimatedSection delay={0.05}>
                <h1 className="max-w-[15ch] font-serif text-[clamp(42px,5.2vw,74px)] font-normal leading-[1.02] tracking-[-0.018em]">
                  {HOME.hero.headlineLead}{' '}
                  <span className="italic text-terracotta">
                    {HOME.hero.headlineEmphasis}
                  </span>{' '}
                  {HOME.hero.headlineTail}
                </h1>
              </AnimatedSection>
              <AnimatedSection delay={0.1}>
                <p className="mt-[30px] max-w-[50ch] text-[18.5px] leading-[1.62] text-muted">
                  {HOME.hero.body}
                </p>
              </AnimatedSection>
              <AnimatedSection delay={0.15}>
                <div className="mt-[38px] flex flex-wrap gap-3.5">
                  <Button href="/contact" arrow>
                    {HOME.hero.ctaPrimary}
                  </Button>
                  <Button href="/work" variant="outline">
                    {HOME.hero.ctaSecondary}
                  </Button>
                </div>
              </AnimatedSection>
              <AnimatedSection delay={0.2}>
                <div className="mt-[54px] flex flex-wrap gap-x-[34px] gap-y-3 border-t border-ink/12 pt-7">
                  {HOME.hero.badges.map((b) => (
                    <div
                      key={b}
                      className="font-mono text-[12.5px] tracking-[0.02em] text-muted"
                    >
                      <span className="text-terracotta">— </span>
                      {b}
                    </div>
                  ))}
                </div>
              </AnimatedSection>
            </div>

            <AnimatedSection delay={0.1}>
              <DashboardMockup />
            </AnimatedSection>
          </div>
        </section>

        {/* ── Marquee ──────────────────────────────────────────── */}
        <Marquee items={HOME.marquee} />

        {/* ── Practices ────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1200px] px-6 py-[124px] sm:px-10">
          <AnimatedSection className="mb-[72px] max-w-[680px]">
            <Eyebrow className="mb-[22px]">{HOME.practicesEyebrow}</Eyebrow>
            <h2 className="font-serif text-[clamp(32px,4.4vw,58px)] font-normal leading-[1.05] tracking-[-0.018em]">
              {HOME.practicesHeadline}
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 gap-px border border-ink/12 bg-ink/12 md:grid-cols-3">
            {HOME.practices.map((p) => (
              <AnimatedSection
                key={p.n}
                className="group flex flex-col bg-cream p-9 transition-colors duration-300 hover:bg-cream-raised"
              >
                <div className="mb-7 font-mono text-[12.5px] text-terracotta">
                  {p.n}
                </div>
                <h3 className="mb-3.5 font-serif text-[27px] font-normal tracking-[-0.01em]">
                  {p.t}
                </h3>
                <p className="mb-6 text-[15.5px] leading-[1.62] text-muted">
                  {p.d}
                </p>
                <div className="mb-7 flex flex-col gap-2.5">
                  {p.items.map((it) => (
                    <div
                      key={it}
                      className="flex items-center gap-3 text-sm text-[#3C382F]"
                    >
                      <span className="h-1 w-1 rounded-full bg-terracotta" />
                      {it}
                    </div>
                  ))}
                </div>
                <Link
                  href={p.href}
                  className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-terracotta"
                >
                  {p.cta} <span className="font-mono">→</span>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </section>

        {/* ── Applied AI band ──────────────────────────────────── */}
        <section className="bg-dark text-light">
          <div className="mx-auto max-w-[1200px] px-6 py-[120px] sm:px-10">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              <AnimatedSection>
                <Eyebrow tone="dark" className="mb-[22px]">
                  {HOME.aiBand.eyebrow}
                </Eyebrow>
                <h2 className="mb-6 font-serif text-[clamp(32px,4.2vw,54px)] font-normal leading-[1.05] tracking-[-0.018em]">
                  {HOME.aiBand.headlineLead}{' '}
                  <span className="italic text-terracotta-light">
                    {HOME.aiBand.headlineEmphasis}
                  </span>
                </h2>
                <p className="mb-8 max-w-[46ch] text-[17.5px] leading-[1.64] text-light/[0.66]">
                  {HOME.aiBand.body}
                </p>
                <div className="mb-9 grid max-w-[440px] grid-cols-1 gap-x-[26px] gap-y-3.5 sm:grid-cols-2">
                  {HOME.aiBand.bullets.map((b) => (
                    <div
                      key={b}
                      className="flex items-center gap-3 text-[14.5px] text-[#E8E2D6]"
                    >
                      <span className="font-mono text-[13px] text-terracotta-light">
                        +
                      </span>
                      {b}
                    </div>
                  ))}
                </div>
                <Button href="/ai" variant="light" arrow>
                  {HOME.aiBand.cta}
                </Button>
              </AnimatedSection>

              <AnimatedSection delay={0.1}>
                <EvalMockup evals={HOME.aiBand.evals} />
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* ── Selected work ────────────────────────────────────── */}
        <section className="mx-auto max-w-[1240px] px-6 py-[124px] sm:px-10">
          <AnimatedSection className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[620px]">
              <Eyebrow className="mb-[22px]">{HOME.featuredEyebrow}</Eyebrow>
              <h2 className="font-serif text-[clamp(32px,4.4vw,58px)] font-normal leading-[1.05] tracking-[-0.018em]">
                {HOME.featuredHeadline}
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
            {featured.map((c) => (
              <AnimatedSection key={c.id}>
                <WorkCard
                  href={`/work/${c.id}`}
                  label={`${shortDiscipline(c.discipline)} · ${c.sector}`}
                  title={c.title}
                  oneLiner={c.oneLiner}
                  withThumb
                />
              </AnimatedSection>
            ))}
          </div>
        </section>

        {/* ── Process ──────────────────────────────────────────── */}
        <section className="border-y border-ink/10 bg-cream-alt">
          <div className="mx-auto max-w-[1200px] px-6 py-28 sm:px-10">
            <AnimatedSection className="mb-[60px]">
              <Eyebrow className="mb-[22px]">{HOME.processEyebrow}</Eyebrow>
              <h2 className="font-serif text-[clamp(30px,4vw,50px)] font-normal leading-[1.05] tracking-[-0.018em]">
                {HOME.processHeadline}
              </h2>
            </AnimatedSection>
            <div className="grid grid-cols-1 gap-px border border-ink/14 bg-ink/14 sm:grid-cols-2 lg:grid-cols-5">
              {HOME.process.map((p) => (
                <AnimatedSection key={p.n} className="bg-cream-alt px-6 pb-[34px] pt-[30px]">
                  <div className="mb-6 font-mono text-xs text-terracotta">{p.n}</div>
                  <h3 className="mb-2.5 text-[17px] font-medium tracking-[-0.01em]">
                    {p.t}
                  </h3>
                  <p className="text-[13.5px] leading-[1.55] text-muted">{p.d}</p>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1200px] px-6 py-[104px] sm:px-10">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {HOME.stats.map((s) => (
              <AnimatedSection key={s.l} className="border-t-2 border-ink pt-5">
                <div className="font-serif text-[clamp(40px,5vw,62px)] font-normal leading-none tracking-[-0.02em]">
                  {s.k}
                </div>
                <div className="mt-3.5 text-[15px] font-medium tracking-[-0.01em]">
                  {s.l}
                </div>
                <div className="mt-[5px] text-[13px] leading-[1.5] text-faint">
                  {s.s}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </section>

        {/* ── Team preview ─────────────────────────────────────── */}
        <section className="mx-auto max-w-[1200px] px-6 pb-[116px] sm:px-10">
          <AnimatedSection className="grid items-center gap-12 rounded-2xl bg-dark px-8 py-14 text-light sm:px-14 lg:grid-cols-2">
            <div>
              <Eyebrow tone="dark" className="mb-5">
                {HOME.teamPreview.eyebrow}
              </Eyebrow>
              <h2 className="mb-[18px] font-serif text-[clamp(28px,3.4vw,42px)] font-normal leading-[1.08] tracking-[-0.015em]">
                {HOME.teamPreview.headline}
              </h2>
              <p className="mb-7 max-w-[42ch] text-base leading-[1.62] text-light/[0.64]">
                {HOME.teamPreview.body}
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-[15px] font-medium text-light transition-colors hover:text-terracotta-light"
              >
                {HOME.teamPreview.cta} <span className="font-mono">→</span>
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {HOME.teamPreview.ids.map((t) => (
                <div
                  key={t}
                  className="flex h-[62px] w-[62px] items-center justify-center rounded-full border border-light/25 font-mono text-sm text-terracotta-light"
                >
                  {t}
                </div>
              ))}
            </div>
          </AnimatedSection>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <CtaBand
          headline={CTA_HOME.headline}
          body={CTA_HOME.body}
          buttonLabel={CTA_HOME.button}
        />
      </main>
      <Footer />
    </>
  );
}
