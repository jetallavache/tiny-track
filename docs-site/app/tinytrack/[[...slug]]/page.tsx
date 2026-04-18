import { notFound, redirect } from 'next/navigation';
import { DocsLayout } from '@/components/docs-layout';
import { tinytracNav, navItems } from '@/lib/docs';

const pages = {
  overview: () => import('@/content/tinytrack/overview.mdx'),
  api: () => import('@/content/tinytrack/api.mdx'),
  configuration: () => import('@/content/tinytrack/configuration.mdx'),
  docker: () => import('@/content/tinytrack/docker.mdx'),
  troubleshooting: () => import('@/content/tinytrack/troubleshooting.mdx'),
} as const;

type Slug = keyof typeof pages;

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug: [slug] }));
}

export default async function TinytrackPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (!slug || slug.length === 0) redirect('/tinytrack/overview');

  const key = slug[0] as Slug;
  if (!(key in pages)) notFound();

  const { default: Content } = await pages[key]();
  const items = navItems(tinytracNav, 'tinytrack');

  return (
    <DocsLayout section="tinytrack" items={items} activeHref={`/tinytrack/${key}`}>
      <Content />
    </DocsLayout>
  );
}
