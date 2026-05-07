import { PROCESS_STEPS } from '@/lib/content';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-40 md:py-56 bg-white">
      <div className="w-full px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32">
        <div className="flex flex-col lg:flex-row gap-20 lg:gap-32">
          <AnimatedSection className="lg:w-72 flex-shrink-0">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-muted mb-8">
              The Process
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-brand-ink leading-tight">
              How we build your software.
            </h2>
          </AnimatedSection>

          <div className="flex-1">
            {PROCESS_STEPS.map((step, i) => (
              <AnimatedSection key={step.step} delay={i * 0.1}>
                <div className="py-8 border-t border-brand-border flex gap-8 items-baseline">
                  <span className="text-xs text-brand-muted tracking-widest flex-shrink-0 w-8">
                    {step.step}
                  </span>
                  <div>
                    <h3 className="font-semibold text-brand-ink mb-2">{step.title}</h3>
                    <p className="text-sm text-brand-muted leading-relaxed max-w-md">{step.body}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
            <div className="border-t border-brand-border" />
          </div>
        </div>
      </div>
    </section>
  );
}
