'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeSwitcher } from './theme-switcher';

const links = [
  { href: '/components', label: 'components' },
  { href: '/themes', label: 'themes' },
  { href: '/docs', label: 'docs' },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image src="/logo.svg" alt="tinytrack" width={18} height={18} />
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">tinytrack.dev</span>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20 leading-none">
            beta
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-mono transition-colors',
                isActive(href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </Link>
          ))}
          <ThemeSwitcher />
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-border/40 bg-background px-6 py-4 flex flex-col gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-mono transition-colors',
                isActive(href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </Link>
          ))}
          <ThemeSwitcher />
        </div>
      )}
    </header>
  );
}
