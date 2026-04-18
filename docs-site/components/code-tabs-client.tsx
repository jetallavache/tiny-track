'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';

interface CodeTabsClientProps {
  labels: string[];
  codes: string[];
  children: React.ReactNode[]; /* one rendered panel per tab */
  className?: string;
}

export function CodeTabsClient({ labels, codes, children, className }: CodeTabsClientProps) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(codes[active]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn('rounded-xl border border-border overflow-hidden', className)}>
      <div className="flex items-center justify-between border-b border-border bg-muted/30 pr-2">
        <div className="flex">
          {labels.map((label, i) => (
            <button
              key={label}
              onClick={() => setActive(i)}
              className={cn(
                'px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
                i === active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={copy}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      {children.map((panel, i) => (
        <div key={i} className={i === active ? 'block' : 'hidden'}>
          {panel}
        </div>
      ))}
    </div>
  );
}
