import type { Metadata } from "next";
import { CONTACT, SITE } from "@/lib/content";
import Reveal, { Word } from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — Kavas",
  description: "Tell us what you want to own.",
};

export default function ContactPage() {
  return (
    <div className="inset pt-[calc(var(--header-h)+8vh)] pb-[var(--pad-section)]">
      <p className="label">{CONTACT.heroLabel}</p>
      <Reveal as="h1" className="hero-h mt-6 max-w-[10em]">
        {CONTACT.hero.split(" ").map((w, i) => (
          <span key={i}>
            <Word>{w}</Word>{" "}
          </span>
        ))}
      </Reveal>

      <div className="contact-grid mt-24">
        <div className="max-w-[24em]">
          <p className="body-text">{CONTACT.body}</p>
          <p className="meta mt-8">{CONTACT.formNote}</p>
          <p className="mt-10">
            <a className="footer-link text-[17px]" href={`mailto:${SITE.email}`}>
              {SITE.email}
            </a>
          </p>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
