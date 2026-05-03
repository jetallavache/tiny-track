'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';

type Tab = 'preview' | 'react' | 'vanilla';

interface LiveExampleClientProps {
  title?: string;
  description?: string;
  reactCode: string;
  vanillaCode: string;
  /** Rendered shiki HTML panels passed as children[0]=react, children[1]=vanilla */
  children: [React.ReactNode, React.ReactNode, React.ReactNode] /* preview, react, vanilla */;
  center?: boolean;
}

export function LiveExampleClient({
  title,
  description,
  reactCode,
  vanillaCode,
  children,
  center,
}: LiveExampleClientProps) {
  const [tab, setTab] = useState<Tab>('preview');
  const [copied, setCopied] = useState(false);

  const currentCode = tab === 'react' ? reactCode : vanillaCode;

  const copy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'react', label: 'React' },
    { id: 'vanilla', label: 'Vanilla JS' },
  ];

  const [previewNode, reactNode, vanillaNode] = children;

  return (
    <div className="mb-8 rounded-xl border border-border overflow-hidden">
      {(title || description) && (
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      )}

      <div className="flex items-center justify-between border-b border-border bg-muted/30 pr-2">
        <div className="flex">
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
        {tab !== 'preview' && (
          <button
            onClick={copy}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <div className={tab === 'preview' ? 'block' : 'hidden'}>
        <div className={cn('p-6 bg-background', center && 'flex justify-center items-start flex-wrap gap-4')}>
          {previewNode}
        </div>
      </div>
      <div className={tab === 'react' ? 'block' : 'hidden'}>{reactNode}</div>
      <div className={tab === 'vanilla' ? 'block' : 'hidden'}>{vanillaNode}</div>
    </div>
  );
}
