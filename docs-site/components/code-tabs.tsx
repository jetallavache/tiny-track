import { codeToHtml } from 'shiki';
import { CodeTabsClient } from './code-tabs-client';

export interface CodeTab {
  label: string;
  lang?: string;
  code: string;
}

interface CodeTabsProps {
  tabs: CodeTab[];
  className?: string;
}

export async function CodeTabs({ tabs, className }: CodeTabsProps) {
  const panels = await Promise.all(
    tabs.map(async (tab) => {
      const html = await codeToHtml(tab.code.trim(), {
        lang: tab.lang ?? 'tsx',
        theme: 'github-dark-default',
      });
      return (
        <div
          className="text-xs [&_pre]:!m-0 [&_pre]:!p-4 [&_pre]:overflow-x-auto [&_pre]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }),
  );

  return (
    <CodeTabsClient
      labels={tabs.map((t) => t.label)}
      codes={tabs.map((t) => t.code.trim())}
      className={className}
    >
      {panels}
    </CodeTabsClient>
  );
}
