import { notFound, redirect } from 'next/navigation';
import { DocsLayout } from '@/components/docs-layout';
import { tinytdNav, navItems } from '@/lib/docs';

const pages = {
  overview: () => import('@/content/tinytd/overview.mdx'),
  install: () => import('@/content/tinytd/install.mdx'),
  configuration: () => import('@/content/tinytd/configuration.mdx'),
  architecture: () => import('@/content/tinytd/architecture.mdx'),
} as const;

type Slug = keyof typeof pages;

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug: [slug] }));
}

export default async function TinytdPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (!slug || slug.length === 0) redirect('/tinytd/overview');

  const key = slug[0] as Slug;
  if (!(key in pages)) notFound();

  const { default: Content } = await pages[key]();
  const items = navItems(tinytdNav, 'tinytd');

  return (
    <DocsLayout section="tinytd" items={items} activeHref={`/tinytd/${key}`}>
      <Content />
    </DocsLayout>
  );
}
