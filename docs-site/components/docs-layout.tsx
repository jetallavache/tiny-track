import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  href: string;
}

interface DocsLayoutProps {
  section: string;
  items: NavItem[];
  activeHref: string;
  children: React.ReactNode;
}

export function DocsLayout({ section, items, activeHref, children }: DocsLayoutProps) {
  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10">
      {/* Sidebar */}
      <aside className="hidden w-52 shrink-0 lg:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section}</p>
        <nav className="flex flex-col gap-0.5">
          {items.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                activeHref === href
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <article className="min-w-0 flex-1 prose prose-invert prose-sm max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
        prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-muted/50
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-table:text-xs prose-th:text-muted-foreground">
        {children}
      </article>
    </div>
  );
}
