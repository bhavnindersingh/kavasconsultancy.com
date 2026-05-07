'use client';
import { useEffect, useState } from 'react';
import { NAV_LINKS } from '@/lib/content';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-white/96 backdrop-blur-md border-b border-brand-border py-4'
          : 'bg-transparent py-6',
      )}
    >
      <div className="w-full px-8 sm:px-12 md:px-14 lg:px-20 xl:px-24 2xl:px-32 flex items-center justify-between">
        <a href="/">
          <span className="text-xl font-bold text-brand-ink tracking-tight">
            Kavas<span className="text-brand-primary">.</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-medium uppercase tracking-[0.2em] text-brand-muted hover:text-brand-ink transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center">
          <a
            href="#contact"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary border-b border-brand-primary pb-0.5 hover:text-brand-mid hover:border-brand-mid transition-colors duration-300"
          >
            Get in Touch
          </a>
        </div>

        <button
          className="md:hidden text-brand-muted hover:text-brand-ink transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white/98 backdrop-blur-md border-t border-brand-border">
          <div className="w-full px-8 sm:px-12 py-8 flex flex-col gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs font-medium uppercase tracking-[0.2em] text-brand-muted hover:text-brand-ink transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary border-b border-brand-primary pb-0.5 self-start"
              onClick={() => setMenuOpen(false)}
            >
              Get in Touch
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
