import { cn } from '@/lib/utils';

interface EyebrowProps {
  children: React.ReactNode;
  /** Show the leading terracotta rule (used in hero eyebrows). */
  bar?: boolean;
  /** Colour tone — clay on light surfaces, sand on dark. */
  tone?: 'light' | 'dark';
  className?: string;
}

export default function Eyebrow({
  children,
  bar = false,
  tone = 'light',
  className,
}: EyebrowProps) {
  const color = tone === 'dark' ? 'text-sand' : 'text-clay';

  if (bar) {
    return (
      <div className={cn('flex items-center gap-3.5', className)}>
        <span className="h-px w-[30px] bg-terracotta" />
        <span
          className={cn(
            'font-mono text-xs uppercase tracking-[0.16em]',
            color,
          )}
        >
          {children}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'font-mono text-xs uppercase tracking-[0.16em]',
        color,
        className,
      )}
    >
      {children}
    </div>
  );
}
