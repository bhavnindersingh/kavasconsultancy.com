import Link from 'next/link';
import Placeholder from './Placeholder';

interface WorkCardProps {
  href: string;
  label: string;
  title: string;
  oneLiner: string;
  /** Render the screenshot placeholder header (home cards). */
  withThumb?: boolean;
}

/** Selected-work / AI-work card used on the home and Applied AI pages. */
export default function WorkCard({
  href,
  label,
  title,
  oneLiner,
  withThumb = false,
}: WorkCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-ink/12 bg-cream-raised transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_44px_-26px_rgba(28,26,22,0.30)]">
        {withThumb && (
          <Placeholder className="h-[222px] border-b border-ink/10" />
        )}
        <div className="flex flex-1 flex-col p-6">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
            {label}
          </div>
          <h3 className="mb-2.5 font-serif text-[22px] font-normal leading-[1.22] tracking-[-0.01em]">
            {title}
          </h3>
          <p className="mb-5 text-[14.5px] leading-[1.56] text-muted">
            {oneLiner}
          </p>
          <span className="mt-auto inline-flex items-center gap-1.5 text-[13.5px] font-medium text-terracotta">
            View case <span className="font-mono">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
