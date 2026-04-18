import { notFound, redirect } from 'next/navigation';
import { DocsLayout } from '@/components/docs-layout';
import { cliNav, navItems } from '@/lib/docs';

const pages = {
  overview: () => import('@/content/tiny-cli/overview.mdx'),
  commands: () => import('@/content/tiny-cli/commands.mdx'),
} as const;

type Slug = keyof typeof pages;

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug: [slug] }));
}

export default async function TinyCliPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (!slug || slug.length === 0) redirect('/tiny-cli/overview');

  const key = slug[0] as Slug;
  if (!(key in pages)) notFound();

  const { default: Content } = await pages[key]();
  const items = navItems(cliNav, 'tiny-cli');

  return (
    <DocsLayout section="tiny-cli" items={items} activeHref={`/tiny-cli/${key}`}>
      <Content />
    </DocsLayout>
  );
}
