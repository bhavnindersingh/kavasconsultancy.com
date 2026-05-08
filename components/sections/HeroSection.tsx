import { ArrowRight, ChevronDown } from 'lucide-react';
import { HERO } from '@/lib/content';

const TAGS = ['4 Engineers', 'Full Code Ownership', 'Cross-Industry'] as const;

// 10 service nodes placed at 36° intervals around the orbital ring
const ORBITAL_NODES = [
  { num: '01', short: 'Frontend' },      // 0°   top
  { num: '02', short: 'Dashboards' },    // 36°  top-right
  { num: '03', short: 'Analytics' },     // 72°  right
  { num: '04', short: 'Integrations' },  // 108° right
  { num: '05', short: 'Inventory' },     // 144° bottom-right
  { num: '06', short: 'Backend & DB' },  // 180° bottom
  { num: '07', short: 'Marketing' },     // 216° bottom-left
  { num: '08', short: 'SEO' },           // 252° far-left
  { num: '09', short: 'CRM' },           // 288° far-left
  { num: '10', short: 'Payroll & HR' },  // 324° top-left
] as const;

const NODE_RADIUS = 40; // % from center

function nodeLayout(x: number, y: number): { cls: string; tf: string } {
  if (x > 60) return { cls: 'flex-row items-center',         tf: 'translate(0,-50%)' };
  if (x < 40) return { cls: 'flex-row-reverse items-center', tf: 'translate(-100%,-50%)' };
  if (y < 50) return { cls: 'flex-col-reverse items-center', tf: 'translate(-50%,-100%)' };
  return           { cls: 'flex-col items-center',           tf: 'translate(-50%,0)' };
}

function ZenOrbital() {
  return (
    <div className="zen-stage relative w-full max-w-[480px] xl:max-w-[620px] 2xl:max-w-[780px] mx-auto aspect-square">
      {/* Inner ambient glow */}
      <div
        aria-hidden="true"
        className="absolute inset-[18%]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(11,67,208,0.50) 0%, rgba(11,67,208,0.18) 45%, transparent 75%)',
          filter: 'blur(32px)',
        }}
      />

      {/* Static outer node track */}
      <div
        className="absolute rounded-full"
        style={{
          top: `${50 - NODE_RADIUS}%`,
          left: `${50 - NODE_RADIUS}%`,
          right: `${50 - NODE_RADIUS}%`,
          bottom: `${50 - NODE_RADIUS}%`,
          border: '1px solid rgba(11,67,208,0.35)',
        }}
      />

      {/* Spoke lines from center to each node */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        {ORBITAL_NODES.map((node, i) => {
          const rad = (i * 36 * Math.PI) / 180;
          const x = 50 + NODE_RADIUS * Math.sin(rad);
          const y = 50 - NODE_RADIUS * Math.cos(rad);
          return (
            <line
              key={node.num}
              x1="50%"
              y1="50%"
              x2={`${x}%`}
              y2={`${y}%`}
              stroke="#0B43D0"
              strokeOpacity="0.10"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {/* Primary rotating shell — contained inside the node ring */}
      <div className="zen-spin absolute inset-[14%]">
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.76)', transform: 'rotateX(75deg)' }} />
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.68)', transform: 'rotateY(72deg)' }} />
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.60)', transform: 'rotateX(42deg) rotateY(54deg)' }} />
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.52)', transform: 'rotateX(20deg) rotateY(35deg)' }} />
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.44)', transform: 'rotateX(60deg) rotateY(10deg)' }} />
        <div className="absolute inset-[20%] rounded-full" style={{ border: '1px solid rgba(11,67,208,0.64)', transform: 'rotateX(30deg)' }} />
      </div>

      {/* Counter-rotating shell */}
      <div className="zen-spin-rev absolute inset-[18%]">
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(11,67,208,0.40)', transform: 'rotateX(33deg) rotateY(68deg)' }} />
        <div className="absolute inset-[18%] rounded-full" style={{ border: '1px solid rgba(11,67,208,0.52)', transform: 'rotateY(30deg) rotateX(10deg)' }} />
      </div>

      {/* Labeled service nodes */}
      {ORBITAL_NODES.map((node, i) => {
        const rad = (i * 36 * Math.PI) / 180;
        const x = 50 + NODE_RADIUS * Math.sin(rad);
        const y = 50 - NODE_RADIUS * Math.cos(rad);
        const { cls, tf } = nodeLayout(x, y);
        return (
          <div
            key={node.short}
            className={`absolute flex ${cls} gap-[3px]`}
            style={{ left: `${x}%`, top: `${y}%`, transform: tf }}
          >
            <div
              className="w-[7px] h-[7px] rounded-full shrink-0"
              style={{
                background: '#0B43D0',
                boxShadow: '0 0 7px rgba(11,67,208,0.9), 0 0 14px rgba(11,67,208,0.4)',
              }}
            />
            <span className="text-[7px] font-light tracking-widest text-brand-primary/50 leading-none shrink-0">
              {node.num}
            </span>
            <span className="text-[8px] font-semibold tracking-widest text-brand-ink/55 whitespace-nowrap uppercase leading-none shrink-0">
              {node.short}
            </span>
          </div>
        );
      })}

      {/* Core */}
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
            'radial-gradient(ellipse 120% 80% at 22% 50%, black 15%, rgba(0,0,0,0.25) 55%, transparent 88%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 120% 80% at 22% 50%, black 15%, rgba(0,0,0,0.25) 55%, transparent 88%)',
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
        <div className="md:col-span-7 xl:col-span-6 flex flex-col justify-center">
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
        <div className="md:col-span-5 xl:col-span-6 relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 80% 70% at 55% 50%, rgba(11,67,208,0.055) 0%, transparent 70%)',
            }}
          />
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
