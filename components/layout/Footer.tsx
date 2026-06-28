import Link from 'next/link';
import { SITE, FOOTER } from '@/lib/content';

export default function Footer() {
  return (
    <footer className="bg-footer text-light">
      <div className="mx-auto max-w-[1200px] px-6 pb-9 pt-[72px] sm:px-10">
        <div className="grid grid-cols-1 gap-12 border-b border-light/12 pb-[54px] sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="max-w-[34ch]">
            <div className="mb-4 font-serif text-[26px] font-medium tracking-[-0.01em]">
              Kavas<span className="text-terracotta-light">.</span>
            </div>
            <p className="mb-[18px] text-[15px] leading-relaxed text-light/55">
              {SITE.tagline}
            </p>
            <a
              href={`mailto:${SITE.email}`}
              className="font-mono text-sm text-terracotta-light transition-colors hover:text-light"
            >
              {SITE.email}
            </a>
          </div>

          {/* Explore */}
          <div>
            <div className="mb-[18px] font-mono text-[11.5px] uppercase tracking-[0.12em] text-light/40">
              Explore
            </div>
            <div className="flex flex-col gap-[11px]">
              {FOOTER.explore.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[14.5px] text-light/[0.78] transition-colors hover:text-light"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <div className="mb-[18px] font-mono text-[11.5px] uppercase tracking-[0.12em] text-light/40">
              Capabilities
            </div>
            <div className="flex flex-col gap-[11px]">
              {FOOTER.capabilities.map((c) => (
                <span key={c} className="text-[14.5px] text-light/[0.62]">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Get in touch */}
          <div>
            <div className="mb-[18px] font-mono text-[11.5px] uppercase tracking-[0.12em] text-light/40">
              Get in Touch
            </div>
            <p className="mb-[18px] max-w-[26ch] text-[14.5px] leading-relaxed text-light/60">
              Ready to build? We respond within 24 hours.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-[14.5px] font-medium text-light transition-colors hover:text-terracotta-light"
            >
              Start a Conversation <span className="font-mono">→</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-7">
          <span className="text-[13px] text-light/40">
            © {SITE.year} Kavas Consultancy. All rights reserved.
          </span>
          <span className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-light/40">
            Custom Software · Applied AI
          </span>
        </div>
      </div>
    </footer>
  );
}
