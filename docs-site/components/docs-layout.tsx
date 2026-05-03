import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/breadcrumb';

export interface NavItem {
  label: string;
  rightLabel?: string;
  href: string;
  group?: string;
}

interface DocsLayoutProps {
  section: string;
  items: NavItem[];
  activeHref: string;
  children: React.ReactNode;
}

export function DocsLayout({ section, items, activeHref, children }: DocsLayoutProps) {
  /* Group items by optional group key */
  const groups: { name: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const g = item.group ?? '';
    const existing = groups.find((x) => x.name === g);
    if (existing) existing.items.push(item);
    else groups.push({ name: g, items: [item] });
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        {groups.map(({ name, items: groupItems }) => (
          <div key={name} className="mb-5">
            {name && (
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3">
                {name}
              </p>
            )}
            {!name && groups.length === 1 && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section}</p>
            )}
            <nav className="flex flex-col gap-0.5">
              {groupItems.map(({ label, rightLabel, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    'flex items-center justify-between',
                    activeHref === href
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{label}</span>
                  {rightLabel && (
                    <span className="text-xs text-muted-foreground/70 font-normal ml-2">{rightLabel}</span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </aside>

      {/* Content */}
      <article className="min-w-0 flex-1">
        <Breadcrumb />
        <div
          className="prose prose-invert prose-sm max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight
          prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
          prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-muted/50
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-table:w-full prose-table:text-xs prose-table:border-collapse
          prose-thead:border-b prose-thead:border-border
          prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-th:text-muted-foreground prose-th:bg-muted/30
          prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border/50
          prose-tr:last:prose-td:border-0"
        >
          {children}
        </div>
      </article>
    </div>
  );
}
