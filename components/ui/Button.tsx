import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  as?: 'button' | 'a';
  href?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  as: Tag = 'button',
  href,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 cursor-pointer';

  const variants = {
    primary:
      'bg-brand-primary text-brand-ink hover:bg-brand-mid active:scale-95 shadow-lg shadow-brand-primary/20',
    outline:
      'border border-brand-primary text-brand-ink hover:bg-brand-primary/10 active:scale-95',
    ghost: 'text-brand-muted hover:text-brand-ink active:scale-95',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  if (Tag === 'a' && href) {
    return (
      <a href={href} className={cn(base, variants[variant], sizes[size], className)}>
        {children}
      </a>
    );
  }

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
