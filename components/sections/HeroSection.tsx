'use client';
import dynamic from 'next/dynamic';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { HERO } from '@/lib/content';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

const HeroCanvas = dynamic(() => import('@/components/three/HeroCanvas'), { ssr: false });

export default function HeroSection() {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <section className="h-screen flex overflow-hidden bg-white">

      {/* Left — left-aligned, vertically centered */}
      <div className="flex flex-col flex-1 min-w-0 pt-20
        px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32">

        {/* This inner div takes all available space and centers the content */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-brand-muted mb-8">
            {HERO.eyebrow}
          </p>

          <h1 className="font-bold text-brand-ink leading-[1.06] tracking-tight whitespace-pre-line
            text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl">
            {HERO.headline}
          </h1>

          <p className="mt-7 text-brand-muted leading-relaxed text-base lg:text-lg max-w-sm">
            {HERO.subheadline}
          </p>

          <div className="mt-11 flex flex-wrap gap-6 items-center">
            <a
              href="#contact"
              className="inline-flex items-center gap-2.5 text-sm font-semibold text-brand-ink
                border-b-2 border-brand-primary pb-0.5 hover:text-brand-primary transition-colors group"
            >
              {HERO.cta}
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-brand-muted hover:text-brand-ink transition-colors
                border-b border-brand-border pb-0.5 hover:border-brand-ink"
            >
              {HERO.ctaSecondary}
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
            {['4 Engineers', 'Full Code Ownership', 'Cross-Industry'].map((tag) => (
              <span key={tag} className="text-xs text-brand-muted/60 tracking-wide">
                — {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll cue pinned to bottom */}
        <div className="pb-8">
          <a
            href="#problem"
            className="text-brand-muted hover:text-brand-ink transition-colors animate-bounce inline-block"
            aria-label="Scroll down"
          >
            <ChevronDown size={20} />
          </a>
        </div>
      </div>

      {/* Right — 3D visualization */}
      {isDesktop ? (
        <div className="flex-[1.1] h-full min-w-0 relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <HeroCanvas />
        </div>
      ) : null}

    </section>
  );
}
