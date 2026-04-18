'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', label: 'Home' },
  { href: '/tinytd', label: 'tinytd' },
  { href: '/tinytrack', label: 'tinytrack' },
  { href: '/tiny-cli', label: 'tiny-cli' },
  { href: '/sdk', label: 'SDK' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-primary">TinyTrack</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                pathname === href || (href !== '/' && pathname.startsWith(href))
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </Link>
          ))}
          <a
            href="https://github.com/jetallavache/tinytrack"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
