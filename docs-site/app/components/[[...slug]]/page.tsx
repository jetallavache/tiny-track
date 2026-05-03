import { notFound, redirect } from 'next/navigation';
import { DocsLayout } from '@/components/docs-layout';
import { componentsNavItems } from '@/lib/docs';
import { ComponentsPage } from '@/components/components-page';

/* Slug → MDX content map for text-only pages */
const mdxPages: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  installation: () => import('@/content/components/installation.mdx'),
  'raw-packets': () => import('@/content/components/raw-packets.mdx'),
};

/* Component showcase pages */
const componentSlugs = [
  'metrics-bar',
  'metrics-panel',
  'time-series-chart',
  'dashboard',
  'timeline',
  'disk-map',
  'metrics-3d',
  'sparkline',
  'system-load',
];

export function generateStaticParams() {
  return [
    ...Object.keys(mdxPages).map((slug) => ({ slug: [slug] })),
    ...componentSlugs.map((slug) => ({ slug: [slug] })),
  ];
}

export default async function ComponentsRoute({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const key = slug?.[0];

  /* Root /components → introduction */
  if (!key) {
    const { default: Content } = await import('@/content/components/introduction.mdx');
    return (
      <DocsLayout section="Components" items={componentsNavItems()} activeHref="/components">
        <Content />
      </DocsLayout>
    );
  }

  /* MDX-only pages */
  if (key in mdxPages) {
    const { default: Content } = await mdxPages[key]();
    return (
      <DocsLayout section="Components" items={componentsNavItems()} activeHref={`/components/${key}`}>
        <Content />
      </DocsLayout>
    );
  }

  /* Component showcase pages */
  if (componentSlugs.includes(key)) {
    return (
      <DocsLayout section="Components" items={componentsNavItems()} activeHref={`/components/${key}`}>
        <ComponentsPage slug={key} />
      </DocsLayout>
    );
  }

  notFound();
}
