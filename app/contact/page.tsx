import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedSection from '@/components/ui/AnimatedSection';
import Eyebrow from '@/components/ui/Eyebrow';
import ContactForm from '@/components/sections/ContactForm';
import { CONTACT, SITE } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Get in Touch — Kavas Consultancy',
  description:
    "Tell us about your business and what isn't working. We'll get back within 24 hours — no sales pitch, just a conversation.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="mx-auto max-w-[1200px] px-6 pb-[100px] pt-20 sm:px-10">
          <div className="grid grid-cols-1 gap-[72px] lg:grid-cols-2">
            {/* Messaging */}
            <AnimatedSection className="lg:self-start">
              <Eyebrow className="mb-6">{CONTACT.eyebrow}</Eyebrow>
              <h1 className="max-w-[14ch] font-serif text-[clamp(40px,5vw,68px)] font-normal leading-[1.02] tracking-[-0.018em]">
                {CONTACT.headlineLead}{' '}
                <span className="italic text-terracotta">
                  {CONTACT.headlineEmphasis}
                </span>
              </h1>
              <p className="my-10 max-w-[46ch] text-[18px] leading-[1.62] text-muted">
                {CONTACT.body}
              </p>
              <div className="mb-11 flex flex-col gap-[18px]">
                {CONTACT.promises.map((p) => (
                  <div key={p} className="flex items-start gap-3 text-[15.5px] text-[#3C382F]">
                    <span className="font-mono text-terracotta">→</span>
                    {p}
                  </div>
                ))}
              </div>
              <div className="border-t border-ink/12 pt-[26px]">
                <div className="mb-[7px] text-[13px] text-[#8A8378]">Prefer email?</div>
                <a
                  href={`mailto:${SITE.email}`}
                  className="font-mono text-[16px] text-terracotta transition-colors hover:text-terracotta-light"
                >
                  {SITE.email}
                </a>
              </div>
            </AnimatedSection>

            {/* Form */}
            <AnimatedSection delay={0.1}>
              <ContactForm />
            </AnimatedSection>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
