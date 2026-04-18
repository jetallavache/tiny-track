import { codeToHtml } from 'shiki';
import { LiveExampleClient } from './live-example-client';

interface LiveExampleProps {
  title?: string;
  description?: string;
  react: string;
  vanilla: string;
  children: React.ReactNode;
  center?: boolean;
}

export async function LiveExample({ title, description, react, vanilla, children, center }: LiveExampleProps) {
  const [reactHtml, vanillaHtml] = await Promise.all([
    codeToHtml(react.trim(), { lang: 'tsx', theme: 'github-dark-default' }),
    codeToHtml(vanilla.trim(), { lang: 'html', theme: 'github-dark-default' }),
  ]);

  const reactPanel = (
    <div
      className="text-xs [&_pre]:!m-0 [&_pre]:!p-4 [&_pre]:overflow-x-auto [&_pre]:leading-relaxed"
      dangerouslySetInnerHTML={{ __html: reactHtml }}
    />
  );

  const vanillaPanel = (
    <div
      className="text-xs [&_pre]:!m-0 [&_pre]:!p-4 [&_pre]:overflow-x-auto [&_pre]:leading-relaxed"
      dangerouslySetInnerHTML={{ __html: vanillaHtml }}
    />
  );

  return (
    <LiveExampleClient
      title={title}
      description={description}
      reactCode={react.trim()}
      vanillaCode={vanilla.trim()}
      center={center}
    >
      {[children, reactPanel, vanillaPanel]}
    </LiveExampleClient>
  );
}
