import { cn } from '@/lib/utils';

interface PlaceholderProps {
  label?: string;
  className?: string;
}

/**
 * Stand-in for the design's drag-and-drop image slots. Renders a warm
 * neutral panel with a centred hint until real imagery is supplied.
 */
export default function Placeholder({
  label = 'Drop a screenshot',
  className,
}: PlaceholderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-placeholder text-faint/70',
        className,
      )}
    >
      <span className="font-mono text-[11.5px] uppercase tracking-[0.1em]">
        {label}
      </span>
    </div>
  );
}
