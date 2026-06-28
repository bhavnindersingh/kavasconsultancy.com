'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '@/lib/content';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/[0.82] backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-[1200px] items-center justify-between px-6 sm:px-10">
        <Link
          href="/"
          className="font-serif text-[25px] font-medium tracking-[-0.01em] text-ink"
        >
          Kavas<span className="text-terracotta">.</span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-[14.5px] tracking-[-0.01em] transition-colors',
                isActive(link.href)
                  ? 'text-ink'
                  : 'text-[#5C564D] hover:text-ink',
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium tracking-[-0.01em] text-cream transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-terracotta"
          >
            Get in Touch
          </Link>
        </nav>

        <button
          className="text-muted transition-colors hover:text-ink md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-ink/10 bg-cream/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-5 px-6 py-7 sm:px-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[15px] text-[#5C564D] transition-colors hover:text-ink"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className="self-start rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream"
              onClick={() => setMenuOpen(false)}
            >
              Get in Touch
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
