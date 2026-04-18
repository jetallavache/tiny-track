import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    /* Callout blocks rendered from blockquote */
    blockquote: ({ children }) => (
      <blockquote className="not-prose my-4 rounded-lg border-l-4 border-primary/50 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        {children}
      </blockquote>
    ),
  };
}
