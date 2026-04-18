import { DocsLayout } from '@/components/docs-layout';
import { sdkNavItems } from '@/lib/docs';
import { ComponentsPageClient } from './client';

export default function ComponentsPage() {
  return (
    <DocsLayout section="SDK" items={sdkNavItems()} activeHref="/sdk/components">
      <ComponentsPageClient />
    </DocsLayout>
  );
}
