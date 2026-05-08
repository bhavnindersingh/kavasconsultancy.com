import { SOLUTION } from '@/lib/content';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default function SolutionSection() {
  return (
    <section className="relative py-40 md:py-56 bg-brand-primary">
      <div aria-hidden="true" className="zen-grid-inv" style={{ maskImage: 'radial-gradient(ellipse 90% 80% at 25% 30%, black 10%, transparent 65%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 25% 30%, black 10%, transparent 65%)' }} />
      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-0 w-1/2 h-1/2" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-1/4 w-1/3 h-2/3" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      <div className="w-full px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32">
        <AnimatedSection direction="left" className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/55 mb-8">
            {SOLUTION.eyebrow}
          </p>
          <h2 className="text-4xl md:text-6xl font-bold text-white leading-[1.08] tracking-tight">
            {SOLUTION.headline}
          </h2>
          <p className="mt-8 text-xl text-white/70 leading-relaxed max-w-lg">{SOLUTION.body}</p>
        </AnimatedSection>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-0">
          {SOLUTION.points.map((point, i) => (
            <AnimatedSection key={point.title} delay={i * 0.1}>
              <div className="py-8 border-t border-white/15">
                <h3 className="font-semibold text-white mb-2">{point.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed max-w-sm">{point.body}</p>
              </div>
            </AnimatedSection>
          ))}
          <div className="border-t border-white/15" />
          <div className="border-t border-white/15" />
        </div>
      </div>
    </section>
  );
}
