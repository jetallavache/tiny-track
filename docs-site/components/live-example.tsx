'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type Tab = 'preview' | 'react' | 'vanilla';

interface LiveExampleProps {
  title?: string;
  description?: string;
  /** React/TSX snippet shown in the React tab */
  react: string;
  /** Vanilla JS snippet shown in the Vanilla JS tab */
  vanilla: string;
  /** The rendered preview */
  children: React.ReactNode;
  /** Center preview content */
  center?: boolean;
}

export function LiveExample({ title, description, react, vanilla, children, center }: LiveExampleProps) {
  const [tab, setTab] = useState<Tab>('preview');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'react', label: 'React' },
    { id: 'vanilla', label: 'Vanilla JS' },
  ];

  return (
    <div className="mb-8 rounded-xl border border-border overflow-hidden">
      {(title || description) && (
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-border bg-muted/30">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
              tab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'preview' && (
        <div className={cn('p-6 bg-background', center && 'flex justify-center items-start flex-wrap gap-4')}>
          {children}
        </div>
      )}
      {tab === 'react' && (
        <pre className="m-0 p-4 overflow-x-auto bg-muted/20 text-xs font-mono leading-relaxed text-foreground">
          <code>{react.trim()}</code>
        </pre>
      )}
      {tab === 'vanilla' && (
        <pre className="m-0 p-4 overflow-x-auto bg-muted/20 text-xs font-mono leading-relaxed text-foreground">
          <code>{vanilla.trim()}</code>
        </pre>
      )}
    </div>
  );
}
