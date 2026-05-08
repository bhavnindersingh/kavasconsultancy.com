import { Package, AlertTriangle, Zap } from 'lucide-react';
import { PAIN_POINTS } from '@/lib/content';
import AnimatedSection from '@/components/ui/AnimatedSection';

const ICON_MAP = { Package, AlertTriangle, Zap } as const;

export default function ProblemSection() {
  return (
    <section id="problem" className="relative py-40 md:py-56 bg-white">
      <div aria-hidden="true" className="zen-grid" style={{ maskImage: 'radial-gradient(ellipse 65% 65% at 85% 50%, black 10%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 65% 65% at 85% 50%, black 10%, transparent 75%)' }} />
      <div aria-hidden="true" className="pointer-events-none absolute right-0 top-1/4 w-1/2 h-1/2" style={{ background: 'radial-gradient(circle, rgba(11,67,208,0.07) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      <div className="w-full px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32">
        <AnimatedSection className="mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-muted">
            The Problem
          </p>
        </AnimatedSection>

        {PAIN_POINTS.map((point, i) => {
          const Icon = ICON_MAP[point.icon as keyof typeof ICON_MAP];
          return (
            <AnimatedSection key={point.title} delay={i * 0.12}>
              <div className="py-10 border-t border-brand-border group">
                <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-16">
                  <span className="text-xs text-brand-muted tracking-widest flex-shrink-0 w-6 pt-1">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="md:w-60 flex-shrink-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Icon size={16} className="text-brand-primary" />
                      <h3 className="text-lg font-semibold text-brand-ink">{point.title}</h3>
                    </div>
                  </div>
                  <p className="text-brand-muted leading-relaxed md:max-w-xl">{point.body}</p>
                </div>
              </div>
            </AnimatedSection>
          );
        })}

        <div className="border-t border-brand-border" />
      </div>
    </section>
  );
}
