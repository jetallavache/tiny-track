import { SystemLoad } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, PropsTable, PreviewGrid, Preview, Divider } from '../components.js';

export function PageSystemLoad() {
  return (
    <div>
      <PageTitle
        title="SystemLoad"
        badge="component"
        desc="Gauge visualization of overall system load. Analyzes load averages and process counts to produce a single 0–100 score with color-coded level and trend indicator."
      />

      <PageSection title="Preview">
        <PreviewGrid minWidth={180}>
          <Preview><SystemLoad size="s" /></Preview>
          <Preview><SystemLoad size="m" /></Preview>
          <Preview><SystemLoad size="l" /></Preview>
        </PreviewGrid>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <CodeBlock
          code={`import { TinyTrackProvider, SystemLoad } from 'tinytsdk/react';

<TinyTrackProvider url="ws://localhost:25015">
  <SystemLoad />
  <SystemLoad size="l" />
</TinyTrackProvider>`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'size', type: '"s" | "m" | "l"', default: '"m"', description: 'Component size — affects gauge radius, font sizes' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Override theme tokens' },
          ]}
        />
      </PageSection>
    </div>
  );
}
