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
  const rendered = await Promise.all(
    tabs.map((tab) =>
      codeToHtml(tab.code.trim(), {
        lang: tab.lang ?? 'tsx',
        theme: 'github-dark-default',
      }),
    ),
  );

  return (
    <CodeTabsClient
      labels={tabs.map((t) => t.label)}
      codes={tabs.map((t) => t.code.trim())}
      htmls={rendered}
      className={className}
    />
  );
}
