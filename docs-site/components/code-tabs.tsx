'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface CodeTab {
  label: string;
  language?: string;
  code: string;
}

interface CodeTabsProps {
  tabs: CodeTab[];
  className?: string;
}

export function CodeTabs({ tabs, className }: CodeTabsProps) {
  const [active, setActive] = useState(0);

  return (
    <div className={cn('rounded-xl border border-border overflow-hidden', className)}>
      {/* Tab bar */}
      <div className="flex border-b border-border bg-muted/30">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={cn(
              'px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
              i === active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Code */}
      <pre className="m-0 p-4 overflow-x-auto bg-muted/20 text-xs font-mono leading-relaxed text-foreground">
        <code>{tabs[active].code.trim()}</code>
      </pre>
    </div>
  );
}
