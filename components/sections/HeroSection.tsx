import { ArrowRight, ChevronDown } from 'lucide-react';
import { HERO } from '@/lib/content';

const TAGS = ['4 Engineers', 'Full Code Ownership', 'Cross-Industry'] as const;

function ZenOrbital() {
  return (
    <div className="zen-stage relative w-full max-w-[480px] mx-auto aspect-square">
      {/* Outer diffuse halo */}
      <div
        aria-hidden="true"
        className="absolute -inset-6"
        style={{
          background:
            'radial-gradient(circle at center, transparent 30%, rgba(11,67,208,0.09) 55%, transparent 80%)',
          filter: 'blur(20px)',
        }}
      />
      {/* Inner ambient glow */}
      <div
        aria-hidden="true"
        className="absolute inset-[10%]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(11,67,208,0.45) 0%, rgba(11,67,208,0.16) 40%, transparent 70%)',
          filter: 'blur(22px)',
        }}
      />

      {/* Primary rotating shell — 5 outer rings + 1 inner */}
      <div className="zen-spin absolute inset-0">
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.78)', transform: 'rotateX(75deg)' }} />
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.70)', transform: 'rotateY(72deg)' }} />
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.62)', transform: 'rotateX(42deg) rotateY(54deg)' }} />
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.54)', transform: 'rotateX(20deg) rotateY(35deg)' }} />
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.46)', transform: 'rotateX(60deg) rotateY(10deg)' }} />
        <div className="absolute inset-[16%] rounded-full" style={{ border: '1px solid rgba(11,67,208,0.68)', transform: 'rotateX(30deg)' }} />
      </div>

      {/* Counter-rotating shell — 2 rings */}
      <div className="zen-spin-rev absolute inset-0">
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.42)', transform: 'rotateX(33deg) rotateY(68deg)' }} />
        <div className="absolute inset-[10%] rounded-full" style={{ border: '1px solid rgba(11,67,208,0.56)', transform: 'rotateY(30deg) rotateX(10deg)' }} />
      </div>

      {/* Orbiting node dots — each is a rotating container with a dot at its edge */}
      {/* Dot A: radius ~38% of stage, 11s */}
      <div className="zen-node-a absolute inset-[12%]">
        <div
          className="absolute top-1/2 left-0 w-2 h-2 -translate-y-1/2 rounded-full"
          style={{
            background: '#0B43D0',
            boxShadow: '0 0 10px rgba(11,67,208,1), 0 0 20px rgba(11,67,208,0.55)',
          }}
        />
      </div>
      {/* Dot B: radius ~26% of stage, 17s */}
      <div className="zen-node-b absolute inset-[24%]">
        <div
          className="absolute top-0 left-1/2 w-1.5 h-1.5 -translate-x-1/2 rounded-full"
          style={{
            background: 'rgba(11,67,208,0.9)',
            boxShadow: '0 0 8px rgba(11,67,208,0.9), 0 0 16px rgba(11,67,208,0.4)',
          }}
        />
      </div>
      {/* Dot C: radius ~47% of stage, 23s — soft lighter blue */}
      <div className="zen-node-c absolute inset-[3%]">
        <div
          className="absolute bottom-0 left-1/2 w-1.5 h-1.5 -translate-x-1/2 rounded-full"
          style={{
            background: 'rgba(77,143,255,0.85)',
            boxShadow: '0 0 10px rgba(77,143,255,0.8), 0 0 20px rgba(77,143,255,0.3)',
          }}
        />
      </div>

      {/* Core — white-hot center + triple glow halo */}
      <div
        aria-hidden="true"
        className="zen-core absolute top-1/2 left-1/2 w-5 h-5 rounded-full"
        style={{
          background:
            'radial-gradient(circle, #FFFFFF 0%, #8AB4FF 20%, #0B43D0 50%, rgba(11,67,208,0) 80%)',
          boxShadow:
            '0 0 16px rgba(11,67,208,1), 0 0 36px rgba(11,67,208,0.6), 0 0 72px rgba(11,67,208,0.25)',
        }}
      />
    </div>
  );
}

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
        {/* Left — text */}
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

        {/* Right — zen orbital */}
        <div className="md:col-span-5 flex items-center justify-center">
          <ZenOrbital />
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
