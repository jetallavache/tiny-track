import type { MDXComponents } from 'mdx/types';

function MdxCode({ children, className }: { children?: string; className?: string }) {
  const lang = className?.replace('language-', '') ?? 'text';
  void lang;
  if (!children) return null;
  return (
    <pre className="rounded-xl border border-border bg-muted/30 p-4 overflow-x-auto text-xs font-mono leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

const InlineCode = ({ children, className, ...props }: any) => {
  const isInsidePre = false;

  return (
    <code className={`${className || ''} inline-code`} {...props}>
      {children}
    </code>
  );
};

const CodeBlock = ({ children, className, ...props }: any) => {
  return (
    <code className={`${className || ''} block-code`} {...props}>
      {children}
    </code>
  );
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    pre: ({ children, ...props }) => (
      <pre
        className="my-4 overflow-x-auto rounded-md bg-[#0d1117] p-4"
        style={{
          backgroundColor: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '6px',
        }}
        {...props}
      >
        {children}
      </pre>
    ),
    code: ({ children, className, ...props }) => {
      // Проверяем, является ли code блочным (имеет класс language-xxx)
      const isBlockCode = className?.includes('language-');

      if (isBlockCode) {
        // Блочный код - внутри pre, стили добавляются через pre
        return (
          <code
            className={className}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.85rem',
              lineHeight: '1.45',
              color: '#e6edf3',
            }}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className="rounded-md px-1.5 py-0.5 text-sm font-mono"
          style={{
            backgroundColor: 'rgba(110, 118, 129, 0.4)',
            color: '#e6edf3',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.85em',
            padding: '0.2em 0.4em',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
          }}
          {...props}
        >
          {children}
        </code>
      );
    },
    blockquote: ({ children }) => (
      <blockquote
        className="my-4 border-l-4 border-[#3b82f6] bg-[#1f2937]/30 px-4 py-3 text-sm"
        style={{
          borderLeftColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          borderRadius: '0 6px 6px 0',
        }}
      >
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto rounded-lg border border-[#30363d]">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="border-b border-[#30363d] bg-[#21262d]">{children}</thead>,
    th: ({ children }) => <th className="px-4 py-2 text-left font-semibold text-[#e6edf3]">{children}</th>,
    td: ({ children }) => (
      <td className="border-b border-[#30363d] px-4 py-2 text-[#e6edf3]/80 last:border-0">{children}</td>
    ),
    tr: ({ children }) => <tr className="hover:bg-[#161b22] transition-colors">{children}</tr>,
    h1: ({ children }) => <h1 className="mb-4 mt-6 text-3xl font-bold border-b border-[#30363d] pb-2">{children}</h1>,
    h2: ({ children }) => (
      <h2 className="mb-3 mt-5 text-2xl font-semibold border-b border-[#30363d] pb-1">{children}</h2>
    ),
    h3: ({ children }) => <h3 className="mb-2 mt-4 text-xl font-semibold">{children}</h3>,
    a: ({ children, href }) => (
      <a
        href={href}
        className="text-[#58a6ff] hover:underline"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),
    p: ({ children }) => <p className="mb-4 leading-7 text-[#e6edf3]/90">{children}</p>,
    ul: ({ children }) => <ul className="mb-4 ml-6 list-disc space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal space-y-1">{children}</ol>,
    li: ({ children }) => <li className="text-[#e6edf3]/90">{children}</li>,
  };
}
