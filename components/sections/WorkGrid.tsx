'use client';
import { useState } from 'react';
import Link from 'next/link';
import Placeholder from '@/components/ui/Placeholder';
import { CASE_STUDIES, WORK } from '@/lib/content';
import { cn } from '@/lib/utils';

export default function WorkGrid() {
  const [filter, setFilter] = useState<string>('all');

  const list =
    filter === 'all'
      ? CASE_STUDIES
      : CASE_STUDIES.filter((c) => c.discipline === filter);

  return (
    <>
      {/* Filter tabs */}
      <div className="mb-11 flex flex-wrap gap-2.5 border-b border-ink/12 pb-6">
        {WORK.filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full border px-[18px] py-[9px] text-sm font-medium transition-all duration-200',
                active
                  ? 'border-ink bg-ink text-cream'
                  : 'border-ink/20 text-muted hover:border-ink/40',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <Link key={c.id} href={`/work/${c.id}`} className="group block">
            <div className="overflow-hidden rounded-xl border border-ink/10 bg-cream-raised transition-[transform,box-shadow] duration-300 group-hover:-translate-y-[5px] group-hover:shadow-[0_26px_48px_-26px_rgba(28,26,22,0.32)]">
              <div className="relative">
                <Placeholder className="h-[230px] border-b border-ink/10" />
                <span className="absolute left-3.5 top-3.5 rounded-full bg-cream/90 px-2.5 py-[5px] font-mono text-[10.5px] uppercase tracking-[0.05em] text-[#3C382F] backdrop-blur-sm">
                  {c.discipline}
                </span>
              </div>
              <div className="p-[26px]">
                <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                  {c.sector} · {c.year}
                </div>
                <h3 className="mb-2.5 font-serif text-[24px] font-normal leading-[1.2] tracking-[-0.01em]">
                  {c.title}
                </h3>
                <p className="mb-[18px] text-[14.5px] leading-[1.56] text-muted">
                  {c.oneLiner}
                </p>
                <div className="mb-5 flex flex-wrap gap-[7px]">
                  {c.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-ink/15 px-2.5 py-1 font-mono text-[11px] text-[#6B645A]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-terracotta">
                  View case <span className="font-mono">→</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
