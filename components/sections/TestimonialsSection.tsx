import { TESTIMONIALS } from '@/lib/content';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default function TestimonialsSection() {
  return (
    <section className="py-40 md:py-56 bg-brand-alt">
      <div className="w-full px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32">
        <AnimatedSection className="mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-muted">
            What Clients Say
          </p>
        </AnimatedSection>

        {TESTIMONIALS.map((t, i) => (
          <AnimatedSection key={i} delay={i * 0.12}>
            <div className="py-12 border-t border-brand-border">
              <div className="flex flex-col md:flex-row gap-8 md:gap-24 items-start">
                <div className="md:w-48 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-semibold">
                    {t.initials}
                  </div>
                  <p className="mt-4 font-semibold text-brand-ink text-sm">{t.author}</p>
                  <p className="mt-1 text-xs text-brand-muted leading-relaxed">{t.role}</p>
                </div>
                <p className="text-xl md:text-2xl text-brand-ink leading-relaxed font-light italic flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
            </div>
          </AnimatedSection>
        ))}

        <div className="border-t border-brand-border" />
      </div>
    </section>
  );
}
