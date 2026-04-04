import { useTheme, TimeSeriesChart } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, PropsTable, Preview, Divider } from '../components.js';

const METRICS = ['cpu', 'mem', 'net', 'disk', 'load'] as const;

export function PageTimeSeriesChart() {
  const t = useTheme();
  return (
    <div>
      <PageTitle
        title="TimeSeriesChart"
        badge="component"
        desc="SVG line chart for a single metric across one ring level (L1/L2/L3). Automatically requests history on connect and appends live samples."
      />

      <PageSection title="Preview — all metrics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {METRICS.map((m) => (
            <Preview key={m}>
              <TimeSeriesChart metric={m} height={100} style={{ width: '100%' }} />
            </Preview>
          ))}
        </div>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <CodeBlock
          code={`import { TinyTrackProvider, TimeSeriesChart } from 'tinytsdk/react';
import { RING_L1, RING_L2, RING_L3 } from 'tinytsdk';

<TinyTrackProvider url="ws://localhost:25015">
  {/* CPU — last hour (L1, 1s resolution) */}
  <TimeSeriesChart metric="cpu" />

  {/* Memory — last 24h (L2, 1m resolution) */}
  <TimeSeriesChart metric="mem" level={RING_L2} maxSamples={1440} />

  {/* Network — custom height */}
  <TimeSeriesChart metric="net" height={80} style={{ width: '100%' }} />

  {/* Disk — 7 days (L3) */}
  <TimeSeriesChart metric="disk" level={RING_L3} />
</TinyTrackProvider>`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            {
              name: 'metric',
              type: '"cpu"|"mem"|"load"|"net"|"disk"',
              default: '—',
              description: 'Which metric to display (required)',
            },
            {
              name: 'level',
              type: 'number',
              default: 'RING_L1',
              description: 'Ring buffer level: RING_L1 (1h), RING_L2 (24h), RING_L3 (7d)',
            },
            {
              name: 'maxSamples',
              type: 'number',
              default: '60',
              description: 'Maximum samples to keep in the chart buffer',
            },
            { name: 'height', type: 'number', default: '180', description: 'SVG chart height in px' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
            {
              name: 'theme',
              type: 'Partial<TtTheme>',
              default: '—',
              description: 'Override theme tokens for this component only',
            },
          ]}
        />
      </PageSection>

      <Divider />

      <PageSection title="Ring levels">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['RING_L1 (0x01)', '1s resolution', 'Up to 1 hour of data'],
            ['RING_L2 (0x02)', '1m resolution', 'Up to 24 hours of data'],
            ['RING_L3 (0x03)', '1h resolution', 'Up to 7 days of data'],
          ].map(([level, res, span]) => (
            <div
              key={level}
              style={{
                display: 'flex',
                gap: 12,
                padding: '6px 12px',
                background: t.surface,
                borderRadius: t.radius,
                border: `1px solid ${t.divider}`,
              }}
            >
              <code style={{ fontSize: 11, color: t.cpu, fontFamily: 'monospace', minWidth: 120 }}>{level}</code>
              <span style={{ fontSize: 12, color: t.text, fontFamily: t.font, minWidth: 100 }}>{res}</span>
              <span style={{ fontSize: 12, color: t.muted, fontFamily: t.font }}>{span}</span>
            </div>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
