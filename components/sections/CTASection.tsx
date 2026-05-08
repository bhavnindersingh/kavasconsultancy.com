'use client';
import { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { CTA } from '@/lib/content';
import AnimatedSection from '@/components/ui/AnimatedSection';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function CTASection() {
  const [state, setState] = useState<FormState>('idle');
  const [form, setForm] = useState({ name: '', email: '', business: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setState('success');
        setForm({ name: '', email: '', business: '', message: '' });
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  };

  const inputClass =
    'w-full px-0 py-3 bg-transparent border-b border-brand-border text-brand-ink placeholder-brand-muted/40 focus:outline-none focus:border-brand-primary transition-colors text-sm';

  return (
    <section id="contact" className="relative py-40 md:py-56 bg-white">
      <div aria-hidden="true" className="zen-grid" style={{ maskImage: 'radial-gradient(ellipse 65% 70% at 18% 50%, black 10%, transparent 72%)', WebkitMaskImage: 'radial-gradient(ellipse 65% 70% at 18% 50%, black 10%, transparent 72%)' }} />
      <div aria-hidden="true" className="pointer-events-none absolute left-0 top-1/4 w-1/2 h-1/2" style={{ background: 'radial-gradient(circle, rgba(11,67,208,0.07) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      <div className="w-full px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32">
        <div className="flex flex-col lg:flex-row gap-20 lg:gap-32 items-start">
          <AnimatedSection direction="left" className="lg:w-80 flex-shrink-0 lg:sticky lg:top-32">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-muted mb-8">
              {CTA.eyebrow}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-brand-ink leading-tight">
              {CTA.headline}
            </h2>
            <p className="mt-6 text-brand-muted leading-relaxed">{CTA.body}</p>

            <div className="mt-10 space-y-3">
              {[
                'We respond within 24 hours',
                'No sales pitch — just a conversation',
                'Free scoping call to understand your needs',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 size={14} className="text-brand-primary flex-shrink-0" />
                  <span className="text-sm text-brand-muted">{item}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection direction="right" className="flex-1 w-full">
            {state === 'success' ? (
              <div className="py-16 text-center border-t border-brand-border">
                <CheckCircle2 size={36} className="text-brand-primary mx-auto mb-6" />
                <h3 className="text-xl font-bold text-brand-ink mb-2">Message received.</h3>
                <p className="text-brand-muted">We&apos;ll get back to you within 24 hours.</p>
                <button
                  onClick={() => setState('idle')}
                  className="mt-8 text-sm text-brand-primary hover:text-brand-mid transition-colors underline underline-offset-4"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1 uppercase tracking-[0.15em]">
                      Your name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Arjun Sharma"
                      className={inputClass}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1 uppercase tracking-[0.15em]">
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="arjun@yourcompany.com"
                      className={inputClass}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1 uppercase tracking-[0.15em]">
                    Business name
                  </label>
                  <input
                    type="text"
                    placeholder="Your Company"
                    className={inputClass}
                    value={form.business}
                    onChange={(e) => setForm({ ...form, business: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1 uppercase tracking-[0.15em]">
                    Tell us about your business
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="What does your business do? What's not working with your current system?"
                    className={`${inputClass} resize-none`}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>

                {state === 'error' && (
                  <p className="text-sm text-red-500">
                    Something went wrong. Please email us at hello@kavasconsultancy.com
                  </p>
                )}

                <button
                  type="submit"
                  disabled={state === 'loading'}
                  className="inline-flex items-center gap-3 text-sm font-semibold text-brand-ink border-b-2 border-brand-primary pb-0.5 hover:text-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {state === 'loading' ? (
                    <span className="inline-block w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                  ) : (
                    <>
                      Send Message
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
