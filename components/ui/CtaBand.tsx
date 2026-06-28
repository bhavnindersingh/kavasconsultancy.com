import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

interface CtaBandProps {
  headline: string;
  body?: string;
  buttonLabel: string;
  buttonHref?: string;
}

/** The terracotta call-to-action band shared across pages. */
export default function CtaBand({
  headline,
  body,
  buttonLabel,
  buttonHref = '/contact',
}: CtaBandProps) {
  return (
    <section id="contact" className="bg-terracotta text-[#F7EFE7]">
      <div className="mx-auto max-w-[1100px] px-6 py-[104px] text-center sm:px-10">
        <AnimatedSection>
          <h2 className="mx-auto max-w-[20ch] font-serif text-[clamp(34px,4.8vw,62px)] font-normal leading-[1.04] tracking-[-0.018em]">
            {headline}
          </h2>
        </AnimatedSection>
        {body && (
          <AnimatedSection delay={0.05}>
            <p className="mx-auto mt-[22px] max-w-[50ch] text-[18px] leading-[1.6] text-[#F7EFE7]/[0.82]">
              {body}
            </p>
          </AnimatedSection>
        )}
        <AnimatedSection delay={0.1}>
          <Link
            href={buttonHref}
            className="mt-9 inline-flex items-center gap-2.5 rounded-full bg-[#F7EFE7] px-8 py-4 text-base font-medium text-ink transition-transform duration-200 hover:-translate-y-0.5"
          >
            {buttonLabel} <span className="font-mono">→</span>
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
