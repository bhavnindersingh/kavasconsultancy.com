import { FOOTER, NAV_LINKS, CAPABILITIES } from '@/lib/content';
import { Mail, ArrowRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-brand-ink text-white">
      <div className="w-full px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32 pt-20 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mb-20">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 pr-12 pb-10 md:pb-0 border-b md:border-b-0 md:border-r border-white/10">
            <span className="text-xl font-bold tracking-tight">
              Kavas<span className="text-brand-primary">.</span>
            </span>
            <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-[14rem]">
              {FOOTER.tagline}
            </p>
            <a
              href={`mailto:${FOOTER.email}`}
              className="mt-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-white/50 hover:text-white transition-colors"
            >
              <Mail size={12} />
              {FOOTER.email}
            </a>
          </div>

          {/* Navigate */}
          <div className="pt-10 md:pt-0 pl-0 md:pl-12 border-r border-white/10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/30 mb-6">
              Navigate
            </p>
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a href="#contact" className="text-sm text-white/50 hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>

          {/* Capabilities */}
          <div className="pt-10 md:pt-0 pl-0 md:pl-12 border-r border-white/10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/30 mb-6">
              Capabilities
            </p>
            <div className="flex flex-col gap-3">
              {CAPABILITIES.map((cap) => (
                <a
                  key={cap.title}
                  href="#capabilities"
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  {cap.title}
                </a>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="col-span-2 md:col-span-1 pt-10 md:pt-0 pl-0 md:pl-12">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/30 mb-6">
              Get in Touch
            </p>
            <p className="text-sm text-white/50 leading-relaxed mb-6 max-w-[14rem]">
              Ready to build your software? We respond within 24 hours.
            </p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-white border-b border-white/40 pb-0.5 hover:text-brand-primary hover:border-brand-primary transition-colors group"
            >
              Start a Conversation
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-2">
          <p className="text-xs text-white/30">{FOOTER.copyright}</p>
          <p className="text-xs text-white/20">{FOOTER.microline}</p>
        </div>
      </div>
    </footer>
  );
}
