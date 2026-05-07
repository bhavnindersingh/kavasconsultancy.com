import {
  Monitor,
  Server,
  LayoutDashboard,
  BarChart3,
  Boxes,
  Users,
  Wallet,
  Search,
  Megaphone,
  Plug,
} from 'lucide-react';
import { CAPABILITIES } from '@/lib/content';
import AnimatedSection from '@/components/ui/AnimatedSection';

const ICON_MAP = {
  Monitor,
  Server,
  LayoutDashboard,
  BarChart3,
  Boxes,
  Users,
  Wallet,
  Search,
  Megaphone,
  Plug,
} as const;

export default function CapabilitiesSection() {
  return (
    <section id="capabilities" className="py-40 md:py-56 bg-brand-alt">
      <div className="w-full px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32">
        <AnimatedSection className="mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-muted mb-8">
            Capabilities
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-ink leading-tight max-w-2xl">
            Everything your business needs. Nothing it doesn&apos;t.
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 mt-16">
          {CAPABILITIES.map((cap, i) => {
            const Icon = ICON_MAP[cap.icon as keyof typeof ICON_MAP];
            return (
              <AnimatedSection key={cap.title} delay={(i % 2) * 0.08 + Math.floor(i / 2) * 0.06}>
                <div className="py-8 border-t border-brand-border flex gap-8">
                  <span className="text-xs text-brand-muted tracking-widest pt-0.5 flex-shrink-0 w-6">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Icon size={15} className="text-brand-primary" />
                      <h3 className="font-semibold text-brand-ink">{cap.title}</h3>
                    </div>
                    <p className="text-sm text-brand-muted leading-relaxed">{cap.body}</p>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
          <div className="border-t border-brand-border" />
          <div className="border-t border-brand-border" />
        </div>
      </div>
    </section>
  );
}
