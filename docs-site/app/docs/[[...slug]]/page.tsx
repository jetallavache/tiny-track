import { notFound, redirect } from 'next/navigation';
import { DocsLayout } from '@/components/docs-layout';
import { docsNavItems } from '@/lib/docs';

const pages: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  overview: () => import('@/content/docs/overview.mdx'),
  /* SDK */
  'sdk/client': () => import('@/content/docs/sdk/client.mdx'),
  'sdk/react': () => import('@/content/docs/sdk/react.mdx'),
  'sdk/lite': () => import('@/content/docs/sdk/lite.mdx'),
  /* Server */
  'server/introduction': () => import('@/content/docs/server/introduction.mdx'),
  'server/installation': () => import('@/content/docs/server/installation.mdx'),
  'server/tinytd': () => import('@/content/docs/server/tinytd.mdx'),
  'server/tinytrack': () => import('@/content/docs/server/tinytrack.mdx'),
  'server/configuration': () => import('@/content/docs/server/configuration.mdx'),
  'server/troubleshooting': () => import('@/content/docs/server/troubleshooting.mdx'),
  'server/cli': () => import('@/content/docs/server/cli.mdx'),
  'server/docker': () => import('@/content/docs/server/docker.mdx'),
};

export function generateStaticParams() {
  return Object.keys(pages).map((key) => ({ slug: key.split('/') }));
}

export default async function DocsRoute({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;

  if (!slug || slug.length === 0) redirect('/docs/overview');

  const key = slug.join('/');
  if (!(key in pages)) notFound();

  const { default: Content } = await pages[key]();
  const activeHref = `/docs/${key}`;

  return (
    <DocsLayout section="Documentation" items={docsNavItems()} activeHref={activeHref}>
      <Content />
    </DocsLayout>
  );
}
