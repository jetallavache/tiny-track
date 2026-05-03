import { notFound } from 'next/navigation';
import { DocsLayout } from '@/components/docs-layout';
import { themesNavItems } from '@/lib/docs';

const pages: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  index: () => import('@/content/themes/overview.mdx'),
  default: () => import('@/content/themes/default.mdx'),
  shadcnui: () => import('@/content/themes/shadcnui.mdx'),
};

export function generateStaticParams() {
  return [{ slug: [] }, { slug: ['default'] }, { slug: ['shadcnui'] }];
}

export default async function ThemesRoute({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const key = slug?.[0] ?? 'index';

  if (!(key in pages)) notFound();

  const { default: Content } = await pages[key]();

  return (
    <DocsLayout section="Themes" items={themesNavItems()} activeHref={key === 'index' ? '/themes' : `/themes/${key}`}>
      <Content />
    </DocsLayout>
  );
}
