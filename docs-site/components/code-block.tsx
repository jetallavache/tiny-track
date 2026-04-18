import { codeToHtml } from 'shiki';

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export async function CodeBlock({ code, lang = 'tsx' }: CodeBlockProps) {
  const html = await codeToHtml(code.trim(), {
    lang,
    theme: 'github-dark-default',
  });

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-border text-xs [&_pre]:!m-0 [&_pre]:!p-4 [&_pre]:overflow-x-auto [&_pre]:leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
