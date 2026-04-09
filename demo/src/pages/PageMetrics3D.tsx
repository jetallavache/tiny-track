import { Metrics3D } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, PropsTable, Preview, Divider } from '../components.js';

export function PageMetrics3D() {
  return (
    <div>
      <PageTitle
        title="Metrics3D"
        badge="component"
        desc="3D bar chart visualization of metrics over time using three.js. Each metric is a column of bars; the Z-axis represents time. The camera auto-rotates slowly."
      />

      <PageSection title="Preview">
        <Preview>
          <Metrics3D metrics={['cpu', 'mem', 'disk']} />
        </Preview>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <CodeBlock
          code={`import { TinyTrackProvider, Metrics3D } from 'tinytsdk/react';

<TinyTrackProvider url="ws://localhost:25015">
  <Metrics3D metrics={['cpu', 'mem', 'disk']} />
  <Metrics3D metrics={['cpu', 'mem', 'disk', 'load', 'net']} size="l" historyDepth={60} />
</TinyTrackProvider>`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'metrics', type: 'MetricType[]', default: "['cpu','mem','disk']", description: 'Metrics to visualise as 3D bar columns' },
            { name: 'historyDepth', type: 'number', default: '40', description: 'Number of time-steps to keep in the 3D scene' },
            { name: 'size', type: '"s" | "m" | "l"', default: '"m"', description: 'Component size — affects canvas dimensions' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Override theme tokens' },
          ]}
        />
      </PageSection>
    </div>
  );
}
