import { ArrowRight, ChevronDown } from 'lucide-react';
import { HERO } from '@/lib/content';

const TAGS = ['4 Engineers', 'Full Code Ownership', 'Cross-Industry'] as const;

const PILLARS = [
  {
    n: '01',
    title: 'Custom-built, end to end',
    body: 'Frontend, backend, dashboards, integrations — one team, one codebase.',
  },
  {
    n: '02',
    title: 'Designed around your workflow',
    body: 'No forcing your business into a rigid template. We map how you actually work, then build it.',
  },
  {
    n: '03',
    title: 'Cross-industry experience',
    body: 'Retail, services, manufacturing, logistics, hospitality, SaaS.',
  },
  {
    n: '04',
    title: 'You own the source',
    body: 'Full code ownership. Zero vendor lock-in.',
  },
] as const;

export default function HeroSection() {
  return (
    <section className="relative min-h-screen md:h-screen flex flex-col overflow-hidden bg-white">
      {/* Decorative blueprint grid (fades to transparent on the right) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(11,67,208,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,67,208,0.06) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse 65% 60% at 30% 50%, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 65% 60% at 30% 50%, black 30%, transparent 80%)',
        }}
      />
      {/* Soft brand-blue glow behind the headline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-0"
        style={{
          left: '-12%',
          top: '15%',
          width: '60vw',
          height: '70vh',
          background:
            'radial-gradient(circle, rgba(11,67,208,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Top thin brand-blue accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent z-10" />

      <div
        className="relative z-10 flex-1 w-full
          px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32
          pt-28 md:pt-32 pb-16
          grid grid-cols-1 md:grid-cols-12 gap-y-16 md:gap-x-12 lg:gap-x-16"
      >
        {/* Left column — headline + CTAs */}
        <div className="md:col-span-7 flex flex-col justify-center">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-brand-primary mb-8">
            <span className="inline-block w-8 h-px bg-brand-primary" />
            {HERO.eyebrow}
          </p>

          <h1
            className="font-bold text-brand-ink tracking-tight whitespace-pre-line
              leading-[1.0]
              text-5xl sm:text-6xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-[8.5rem]"
          >
            {HERO.headline}
          </h1>

          <p className="mt-8 text-brand-muted leading-relaxed text-base lg:text-lg max-w-xl">
            {HERO.subheadline}
          </p>

          <div className="mt-10 flex flex-wrap gap-5 items-center">
            <a
              href="#contact"
              className="group inline-flex items-center gap-3 rounded-full bg-brand-ink text-white
                px-7 py-3.5 text-sm font-semibold hover:bg-brand-primary transition-colors shadow-sm hover:shadow-md"
            >
              {HERO.cta}
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center text-sm font-medium text-brand-ink
                border-b-2 border-brand-border hover:border-brand-ink pb-1 transition-colors"
            >
              {HERO.ctaSecondary}
            </a>
          </div>

          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-2">
            {TAGS.map((tag) => (
              <span
                key={tag}
                className="text-xs text-brand-muted/70 tracking-wide font-medium"
              >
                — {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right column — numbered pillars */}
        <div className="md:col-span-5 flex flex-col justify-center">
          <div
            className="space-y-7
              md:pl-8 lg:pl-12
              md:border-l md:border-brand-border/60"
          >
            {PILLARS.map((p) => (
              <div key={p.n}>
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs font-semibold text-brand-primary tracking-wider">
                    {p.n}
                  </span>
                  <p className="text-base font-semibold text-brand-ink leading-snug">
                    {p.title}
                  </p>
                </div>
                <p className="mt-1.5 ml-9 text-sm text-brand-muted leading-relaxed max-w-sm">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <a
        href="#problem"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20
          text-brand-muted hover:text-brand-ink transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <ChevronDown size={20} />
      </a>
    </section>
  );
}
