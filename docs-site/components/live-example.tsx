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

  return (
    <LiveExampleClient
      title={title}
      description={description}
      reactCode={react.trim()}
      vanillaCode={vanilla.trim()}
      reactHtml={reactHtml}
      vanillaHtml={vanillaHtml}
      center={center}
    >
      {children}
    </LiveExampleClient>
  );
}
