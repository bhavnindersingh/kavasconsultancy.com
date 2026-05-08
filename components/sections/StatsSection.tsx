import { STATS } from '@/lib/content';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default function StatsSection() {
  return (
    <section className="relative py-24 md:py-32 bg-white border-y border-brand-border">
      <div aria-hidden="true" className="zen-grid" style={{ maskImage: 'radial-gradient(ellipse 85% 90% at 50% 50%, black 10%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 85% 90% at 50% 50%, black 10%, transparent 80%)' }} />
      <div className="w-full px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
          {STATS.map((stat, i) => (
            <AnimatedSection key={stat.label} delay={i * 0.08}>
              <div className="py-6 pr-8 border-r border-brand-border last:border-r-0">
                <p className="text-4xl font-bold text-brand-primary tracking-tight">{stat.value}</p>
                <p className="mt-2 text-sm font-medium text-brand-ink">{stat.label}</p>
                <p className="mt-1 text-xs text-brand-muted">{stat.sub}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
