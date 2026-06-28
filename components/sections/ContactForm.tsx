'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CONTACT } from '@/lib/content';
import { cn } from '@/lib/utils';

const fieldLabel = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8378]';
const fieldInput =
  'w-full border-b border-ink/[0.18] bg-transparent px-0.5 pb-3.5 pt-2.5 text-[16px] text-ink outline-none transition-colors focus:border-terracotta';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', business: '', message: '' });
  const [type, setType] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sentName, setSentName] = useState('');

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSentName(form.name.trim().split(' ')[0] || 'there');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex min-h-[420px] flex-col justify-center rounded-2xl border border-ink/12 bg-cream-raised p-10">
        <div className="mb-3 font-mono text-[13px] text-terracotta">— Message received</div>
        <h2 className="font-serif text-[32px] font-normal tracking-[-0.01em]">
          Thanks, {sentName}.
        </h2>
        <p className="mt-3 max-w-[38ch] text-base leading-[1.6] text-muted">
          We&rsquo;ll review what you sent and get back to you within 24 hours. In the
          meantime, feel free to browse our recent work.
        </p>
        <Link
          href="/work"
          className="mt-7 inline-flex items-center gap-2 text-[15px] font-medium text-ink transition-colors hover:text-terracotta"
        >
          See our work <span className="font-mono">→</span>
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col rounded-2xl border border-ink/12 bg-cream-raised p-9 sm:p-10"
    >
      <div className="mb-[26px]">
        <label htmlFor="name" className={fieldLabel}>Your name</label>
        <input id="name" name="name" required value={form.name} onChange={update('name')} placeholder="Jane Doe" className={fieldInput} />
      </div>
      <div className="mb-[26px]">
        <label htmlFor="email" className={fieldLabel}>Email address</label>
        <input id="email" name="email" type="email" required value={form.email} onChange={update('email')} placeholder="jane@company.com" className={fieldInput} />
      </div>
      <div className="mb-[26px]">
        <label htmlFor="business" className={fieldLabel}>Business name</label>
        <input id="business" name="business" value={form.business} onChange={update('business')} placeholder="Acme Co." className={fieldInput} />
      </div>

      <div className="mb-7">
        <span className={fieldLabel}>What do you need?</span>
        <div className="flex flex-wrap gap-[9px]">
          {CONTACT.types.map((t) => {
            const active = type === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(active ? '' : t.key)}
                className={cn(
                  'rounded-full border px-4 py-[9px] text-[13.5px] font-medium transition-all duration-200',
                  active
                    ? 'border-ink bg-ink text-cream'
                    : 'border-ink/20 text-muted hover:border-ink/40',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-8">
        <label htmlFor="message" className={fieldLabel}>Tell us about your business</label>
        <textarea
          id="message"
          name="message"
          required
          rows={3}
          value={form.message}
          onChange={update('message')}
          placeholder="What are you trying to build or fix?"
          className={cn(fieldInput, 'resize-none')}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex items-center gap-2.5 self-start rounded-full bg-ink px-7 py-[15px] text-[15.5px] font-medium tracking-[-0.01em] text-cream transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-terracotta disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-ink"
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
        <span className="font-mono">→</span>
      </button>

      {status === 'error' && (
        <p className="mt-4 text-sm text-terracotta">
          Something went wrong. Please try again, or email us directly.
        </p>
      )}
    </form>
  );
}
