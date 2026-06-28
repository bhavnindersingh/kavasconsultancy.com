import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedSection from '@/components/ui/AnimatedSection';
import Eyebrow from '@/components/ui/Eyebrow';
import CtaBand from '@/components/ui/CtaBand';
import WorkGrid from '@/components/sections/WorkGrid';
import { WORK, CTA_WORK } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Selected Work — Kavas Consultancy',
  description:
    "A cross-section of the software and AI systems we've built end-to-end and handed over to the businesses that run them.",
};

export default function WorkPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="mx-auto max-w-[1240px] px-6 pb-11 pt-[84px] sm:px-10">
          <AnimatedSection>
            <Eyebrow className="mb-[22px]">{WORK.eyebrowHead}</Eyebrow>
            <h1 className="max-w-[18ch] font-serif text-[clamp(40px,5vw,72px)] font-normal leading-[1.03] tracking-[-0.018em]">
              {WORK.headlineLead}{' '}
              <span className="italic text-terracotta">{WORK.headlineEmphasis}</span>
            </h1>
            <p className="mt-7 max-w-[54ch] text-[18.5px] leading-[1.62] text-muted">
              {WORK.body}
            </p>
          </AnimatedSection>
        </section>

        <section className="mx-auto max-w-[1240px] px-6 pb-[110px] sm:px-10">
          <WorkGrid />
        </section>

        <CtaBand headline={CTA_WORK.headline} buttonLabel={CTA_WORK.button} />
      </main>
      <Footer />
    </>
  );
}
