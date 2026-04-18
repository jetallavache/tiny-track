import { notFound, redirect } from 'next/navigation';
import { DocsLayout } from '@/components/docs-layout';
import { sdkNav, navItems } from '@/lib/docs';

const pages = {
  overview: () => import('@/content/sdk/overview.mdx'),
  react: () => import('@/content/sdk/react.mdx'),
  vanilla: () => import('@/content/sdk/vanilla.mdx'),
  lite: () => import('@/content/sdk/lite.mdx'),
} as const;

type Slug = keyof typeof pages;

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug: [slug] }));
}

export default async function SdkPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (!slug || slug.length === 0) redirect('/sdk/overview');

  const key = slug[0] as Slug;
  if (!(key in pages)) notFound();

  const { default: Content } = await pages[key]();
  const items = navItems(sdkNav, 'sdk');

  return (
    <DocsLayout section="SDK" items={items} activeHref={`/sdk/${key}`}>
      <Content />
    </DocsLayout>
  );
}
