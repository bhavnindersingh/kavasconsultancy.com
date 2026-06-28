interface EvalItem {
  l: string;
  v: string;
  w: string;
}

interface EvalMockupProps {
  evals: readonly EvalItem[];
}

/** Dark "model evaluation" mockup card — used on the home AI band and AI hero. */
export default function EvalMockup({ evals }: EvalMockupProps) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-light/12 bg-dark-2 shadow-[0_34px_64px_-34px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between border-b border-light/10 px-5 py-[15px]">
        <span className="font-mono text-[11.5px] tracking-[0.02em] text-[#B7AE9F]">
          eval · support-copilot-v3
        </span>
        <span className="rounded-full bg-[#8FAE84]/15 px-[9px] py-1 font-mono text-[10.5px] text-[#8FAE84]">
          PASSED
        </span>
      </div>
      <div className="px-[22px] py-6">
        <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#897F70]">
          Evaluation scores
        </div>
        <div className="mb-[26px] flex flex-col gap-4">
          {evals.map((e) => (
            <div key={e.l}>
              <div className="mb-[7px] flex justify-between text-[13px]">
                <span className="text-[#E8E2D6]">{e.l}</span>
                <span className="font-mono text-terracotta-light">{e.v}</span>
              </div>
              <div className="h-[5px] overflow-hidden rounded-full bg-light/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-terracotta to-terracotta-light"
                  style={{ width: e.w }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-light/10 pt-[18px]">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#897F70]">
              Training loss
            </span>
            <span className="font-mono text-[11px] text-[#8FAE84]">
              ↓ converged
            </span>
          </div>
          <svg
            viewBox="0 0 320 70"
            preserveAspectRatio="none"
            className="block h-16 w-full"
          >
            <polyline
              points="0,6 28,16 56,28 84,37 112,45 140,51 168,55 196,58 224,60 252,61 280,62 308,62 320,62"
              fill="none"
              stroke="#D98A5E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="0,6 28,16 56,28 84,37 112,45 140,51 168,55 196,58 224,60 252,61 280,62 308,62 320,62 320,70 0,70"
              fill="rgba(217,138,94,0.10)"
              stroke="none"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
