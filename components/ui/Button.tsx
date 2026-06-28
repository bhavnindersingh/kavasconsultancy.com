import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type Variant = 'dark' | 'outline' | 'light' | 'onAccent';
type Size = 'md' | 'lg';

const variants: Record<Variant, string> = {
  // Ink pill on light backgrounds — terracotta on hover.
  dark: 'bg-ink text-cream hover:bg-terracotta hover:-translate-y-0.5',
  // Outlined pill on light backgrounds.
  outline:
    'border border-ink/20 text-ink hover:border-ink hover:bg-ink/[0.04]',
  // Light pill used on dark feature bands.
  light: 'bg-light text-ink hover:bg-terracotta-light hover:-translate-y-0.5',
  // Pill used on the terracotta CTA band.
  onAccent: 'bg-[#F7EFE7] text-ink hover:-translate-y-0.5',
};

const sizes: Record<Size, string> = {
  md: 'px-7 py-[15px] text-[15.5px]',
  lg: 'px-8 py-4 text-base',
};

interface ButtonProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  className?: string;
}

export default function Button({
  href,
  children,
  variant = 'dark',
  size = 'md',
  arrow = false,
  className,
}: ButtonProps) {
  const external = href.startsWith('http') || href.startsWith('mailto:');
  const classes = cn(
    'inline-flex items-center gap-2.5 font-medium rounded-full tracking-[-0.01em] transition-[transform,background-color,border-color] duration-200',
    variants[variant],
    sizes[size],
    className,
  );

  const inner = (
    <>
      {children}
      {arrow && <span className="font-mono leading-none">→</span>}
    </>
  );

  if (external) {
    return (
      <a href={href} className={classes}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {inner}
    </Link>
  );
}
