import { useTheme, TimeSeriesChart } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, PropsTable, Preview, Divider } from '../components.js';
import { RING_L1, RING_L2, RING_L3 } from 'tinytsdk';

const METRICS = ['cpu', 'mem', 'net', 'disk', 'load'] as const;

export function PageTimeSeriesChart() {
  const t = useTheme();
  return (
    <div>
      <PageTitle
        title="TimeSeriesChart"
        badge="component"
        desc="SVG line chart for one or more metrics across a ring level (L1/L2/L3). Supports avg/max/min aggregation and three sizes."
      />

      <PageSection title="Preview — all metrics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {METRICS.map((m) => (
            <Preview key={m}>
              <TimeSeriesChart metrics={[m]} height={100} style={{ width: '100%' }} />
            </Preview>
          ))}
        </div>
      </PageSection>

      <PageSection title="Multi-metric overlay">
        <Preview>
          <TimeSeriesChart metrics={['cpu', 'mem']} style={{ width: '100%' }} />
        </Preview>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <CodeBlock
          code={`import { TinyTrackProvider, TimeSeriesChart } from 'tinytsdk/react';
import { RING_L1, RING_L2 } from 'tinytsdk';

<TinyTrackProvider url="ws://localhost:25015">
  <TimeSeriesChart metrics={['cpu']} />
  <TimeSeriesChart metrics={['cpu', 'mem']} aggregation="max" />
  <TimeSeriesChart metrics={['disk']} level={RING_L2} size="l" />
</TinyTrackProvider>`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'metrics', type: 'MetricType[]', default: "['cpu']", description: 'Metrics to display (overlaid on same chart)' },
            { name: 'aggregation', type: '"avg"|"max"|"min"', default: '"avg"', description: 'Aggregation function applied to samples' },
            { name: 'size', type: '"s"|"m"|"l"', default: '"m"', description: 'Component size — font, padding, default chart height' },
            { name: 'level', type: 'number', default: 'RING_L1', description: 'Ring buffer level: RING_L1 (1h), RING_L2 (24h), RING_L3 (7d)' },
            { name: 'maxSamples', type: 'number', default: '60', description: 'Maximum samples to keep in the chart buffer' },
            { name: 'height', type: 'number', default: 'auto', description: 'SVG chart height in px (overrides size default)' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Override theme tokens' },
          ]}
        />
      </PageSection>
    </div>
  );
}
