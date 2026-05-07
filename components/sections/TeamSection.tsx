import { TEAM, TEAM_MEMBERS } from '@/lib/content';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default function TeamSection() {
  return (
    <section id="team" className="py-40 md:py-56 bg-white">
      <div className="w-full px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32">
        <div className="flex flex-col lg:flex-row gap-20 lg:gap-32">
          <AnimatedSection className="lg:w-72 flex-shrink-0">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-muted mb-8">
              {TEAM.eyebrow}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-brand-ink leading-tight">
              {TEAM.headline}
            </h2>
            <p className="mt-6 text-brand-muted leading-relaxed">{TEAM.body}</p>
          </AnimatedSection>

          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
              {TEAM_MEMBERS.map((member, i) => (
                <AnimatedSection key={`${member.initials}-${i}`} delay={i * 0.07}>
                  <div className="py-6 border-t border-brand-border flex items-center gap-5">
                    <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {member.initials}
                    </div>
                    <div>
                      <p className="font-medium text-brand-ink text-sm leading-tight">{member.name}</p>
                      <p className="text-xs text-brand-muted mt-0.5">{member.role}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
              <div className="border-t border-brand-border" />
              <div className="border-t border-brand-border" />
            </div>

            <AnimatedSection delay={0.5} className="mt-16 pt-10 border-t border-brand-border">
              <p className="text-2xl font-bold text-brand-ink">
                Built by engineers.{' '}
                <span className="text-brand-muted font-normal">Owned by you.</span>
              </p>
              <p className="mt-4 text-brand-muted leading-relaxed max-w-lg">
                You get full access to all source code, infrastructure, and documentation. No lock-in.
              </p>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
