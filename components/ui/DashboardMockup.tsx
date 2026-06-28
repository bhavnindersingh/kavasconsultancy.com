const BARS = [42, 56, 48, 70, 62, 84, 74, 100];

const TASKS = [
  { label: 'Inventory sync', status: 'Complete', color: 'text-[#4E7B53]' },
  { label: 'Support copilot · drafts', status: 'Running…', color: 'text-clay' },
  { label: 'Revenue forecast', status: 'Updated 2m ago', color: 'text-[#8A857A]' },
];

/** Warm "operations overview" product mockup shown in the home hero. */
export default function DashboardMockup() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -right-6 -top-6 z-0 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_70%_30%,rgba(181,81,44,0.16),transparent_70%)] blur-[10px]" />
      <div className="relative z-10 overflow-hidden rounded-[14px] border border-ink/12 bg-cream-raised shadow-[0_34px_64px_-30px_rgba(28,26,22,0.34),0_8px_22px_-14px_rgba(28,26,22,0.18)]">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-ink/8 px-[18px] py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D38B6B]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#D9B36A]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#8FAE84]" />
          <span className="ml-3 font-mono text-[11.5px] tracking-[0.02em] text-[#8A857A]">
            operations.kavas.app
          </span>
        </div>

        <div className="px-[22px] pb-6 pt-[22px]">
          <div className="mb-[18px] flex items-center justify-between">
            <span className="text-[15px] font-medium tracking-[-0.01em]">
              Operations Overview
            </span>
            <span className="rounded-full bg-[#5E8C61]/12 px-[9px] py-1 font-mono text-[10.5px] text-[#5E8C61]">
              ● Live
            </span>
          </div>

          {/* Metric tiles */}
          <div className="mb-[18px] grid grid-cols-2 gap-3">
            {[
              { k: 'Revenue', v: '$128.4k', d: '▲ 18.2% MoM' },
              { k: 'Orders', v: '2,431', d: '▲ 6.1% WoW' },
            ].map((m) => (
              <div key={m.k} className="rounded-[10px] border border-ink/10 p-3.5">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#9A958A]">
                  {m.k}
                </div>
                <div className="mt-1 font-serif text-[30px] font-normal tracking-[-0.01em]">
                  {m.v}
                </div>
                <div className="mt-[3px] text-[11.5px] text-[#4E7B53]">{m.d}</div>
              </div>
            ))}
          </div>

          {/* Throughput chart */}
          <div className="mb-3.5 rounded-[10px] border border-ink/10 px-4 pb-3.5 pt-4">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-[12.5px] font-medium">Throughput</span>
              <span className="font-mono text-[10.5px] text-[#9A958A]">
                Last 8 weeks
              </span>
            </div>
            <div className="flex h-[74px] items-end gap-[7px]">
              {BARS.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[3px]"
                  style={{
                    height: `${h}%`,
                    background:
                      i === BARS.length - 1
                        ? '#B5512C'
                        : i === BARS.length - 2
                          ? 'rgba(181,81,44,0.35)'
                          : 'rgba(28,26,22,0.13)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Task list */}
          <div className="flex flex-col">
            {TASKS.map((t) => (
              <div
                key={t.label}
                className="flex items-center justify-between border-t border-ink/8 py-[9px] text-[12.5px]"
              >
                <span className="text-[#4A463E]">{t.label}</span>
                <span className={`font-mono text-[11px] ${t.color}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
