import { useState } from 'react';
import { useTheme, Timeline } from 'tinytsdk/react';
import type { MetricType, AggregationType } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, PropsTable, Preview, Divider } from '../components.js';

const METRICS: MetricType[] = ['cpu', 'mem', 'load', 'net', 'disk'];
const AGGS: AggregationType[] = ['avg', 'max', 'min'];

export function PageTimeline() {
  const t = useTheme();
  const [metrics, setMetrics] = useState<MetricType[]>(['cpu']);
  const [agg, setAgg] = useState<AggregationType>('avg');

  const toggleMetric = (m: MetricType) =>
    setMetrics((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);

  return (
    <div>
      <PageTitle
        title="Timeline"
        badge="component"
        desc="Fixed-width scrollable bar chart across all three ring levels. Scroll with mouse wheel to navigate history. Supports multiple metrics and aggregation modes."
      />

      <PageSection title="Preview">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {METRICS.map((m) => (
            <button
              key={m}
              onClick={() => toggleMetric(m)}
              style={{
                fontSize: 11, padding: '3px 12px',
                border: `1px solid ${metrics.includes(m) ? t.cpu : t.border}`,
                borderRadius: 99, cursor: 'pointer', fontFamily: t.font,
                background: metrics.includes(m) ? t.cpu + '22' : t.surface,
                color: metrics.includes(m) ? t.cpu : t.muted,
              }}
            >
              {m}
            </button>
          ))}
          <span style={{ color: t.faint, alignSelf: 'center', fontSize: 11 }}>│</span>
          {AGGS.map((a) => (
            <button
              key={a}
              onClick={() => setAgg(a)}
              style={{
                fontSize: 11, padding: '3px 12px',
                border: `1px solid ${agg === a ? t.warn : t.border}`,
                borderRadius: 99, cursor: 'pointer', fontFamily: t.font,
                background: agg === a ? t.warn + '22' : t.surface,
                color: agg === a ? t.warn : t.muted,
              }}
            >
              {a}
            </button>
          ))}
        </div>
        <Preview>
          <Timeline metrics={metrics.length ? metrics : ['cpu']} aggregation={agg} rowHeight={44} style={{ width: '100%' }} />
        </Preview>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <CodeBlock
          code={`import { TinyTrackProvider, Timeline } from 'tinytsdk/react';

<TinyTrackProvider url="ws://localhost:25015">
  <Timeline metrics={['cpu']} />
  <Timeline metrics={['cpu', 'mem', 'load']} aggregation="max" />
  <Timeline metrics={['cpu']} size="l" rowHeight={60} />
</TinyTrackProvider>

// Scroll with mouse wheel to navigate history.
// Click "▶ live" badge to jump back to latest.`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'metrics', type: 'MetricType[]', default: "['cpu']", description: 'Metrics to visualise (overlaid bars per row)' },
            { name: 'aggregation', type: '"avg"|"max"|"min"', default: 'uncontrolled', description: 'Controlled aggregation — omit to show built-in avg/max/min switcher' },
            { name: 'size', type: '"s"|"m"|"l"', default: '"m"', description: 'Component size' },
            { name: 'rowHeight', type: 'number', default: 'auto', description: 'Height of each ring row in px' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Override theme tokens' },
          ]}
        />
      </PageSection>

      <Divider />

      <PageSection title="Built-in controls">
        <CodeBlock
          code={`// Uncontrolled — user can switch aggregation and window size in the UI
<Timeline metrics={['cpu', 'mem']} />

// Controlled aggregation — switcher hidden, aggregation fixed externally
<Timeline metrics={['cpu']} aggregation="max" />

// Scroll with mouse wheel to navigate history.
// Click "▶ live" badge to jump back to latest.`}
        />
      </PageSection>
    </div>
  );
}
