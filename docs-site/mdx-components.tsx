import type { MDXComponents } from 'mdx/types';
import { CodeBlock } from '@/components/code-block';

/* Map fenced code blocks to shiki-highlighted CodeBlock */
function MdxCode({ children, className }: { children?: string; className?: string }) {
  const lang = className?.replace('language-', '') ?? 'text';
  if (!children) return null;
  /* CodeBlock is async — but MDX renders synchronously here.
     Use a plain pre for now; shiki is used in CodeTabs/LiveExample. */
  return (
    <pre className="rounded-xl border border-border bg-muted/30 p-4 overflow-x-auto text-xs font-mono leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    pre: ({ children }) => <>{children}</>,
    code: MdxCode as MDXComponents['code'],
    blockquote: ({ children }) => (
      <blockquote className="not-prose my-4 rounded-lg border-l-4 border-primary/50 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        {children}
      </blockquote>
    ),
  };
}
