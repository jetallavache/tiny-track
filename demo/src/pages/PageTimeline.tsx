import { useState } from 'react';
import { useTheme, Timeline } from 'tinytsdk/react';
import type { TimelineMetric } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, PropsTable, Preview, Divider } from '../components.js';

const METRICS: TimelineMetric[] = ['cpu', 'mem', 'load', 'net', 'disk'];

export function PageTimeline() {
  const t = useTheme();
  const [metric, setMetric] = useState<TimelineMetric>('cpu');

  return (
    <div>
      <PageTitle
        title="Timeline"
        badge="component"
        desc="Scrollable bar chart showing a single metric across all three ring levels (L1 · 1s, L2 · 1m, L3 · 1h). Each row auto-scrolls to the latest sample. Hover for tooltip."
      />

      <PageSection title="Preview">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {METRICS.map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                fontSize: 11,
                padding: '3px 12px',
                border: `1px solid ${metric === m ? t.cpu : t.border}`,
                borderRadius: 99,
                cursor: 'pointer',
                fontFamily: t.font,
                background: metric === m ? t.cpu + '22' : t.surface,
                color: metric === m ? t.cpu : t.muted,
                transition: t.transition,
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <Preview>
          <Timeline metric={metric} rowHeight={44} style={{ width: '100%' }} />
        </Preview>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <CodeBlock
          code={`import { TinyTrackProvider, Timeline } from 'tinytsdk/react';

<TinyTrackProvider url="ws://localhost:25015">
  {/* Default — CPU across all ring levels */}
  <Timeline />

  {/* Memory with taller rows */}
  <Timeline metric="mem" rowHeight={60} />

  {/* Full width */}
  <Timeline metric="cpu" style={{ width: '100%' }} />
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
              default: '"cpu"',
              description: 'Which metric to visualise across all ring levels',
            },
            { name: 'rowHeight', type: 'number', default: '40', description: 'Height of each ring row in px' },
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

      <PageSection title="Behaviour">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['Auto-scroll', 'Each row scrolls to the latest sample when new data arrives'],
            ['Hover tooltip', 'Shows timestamp and formatted value at cursor position'],
            ['History fetch', 'On connect, requests full history for L1 (3600), L2 (1440), L3 (168) samples'],
            ['Live updates', 'L1 row appends each incoming PKT_METRICS packet'],
            ['Deduplication', 'Samples are deduplicated by timestamp before rendering'],
          ].map(([name, desc]) => (
            <div
              key={name}
              style={{
                display: 'flex',
                gap: 12,
                padding: '6px 12px',
                background: t.surface,
                borderRadius: t.radius,
                border: `1px solid ${t.divider}`,
              }}
            >
              <span style={{ fontSize: 12, color: t.text, fontFamily: t.font, minWidth: 120 }}>{name}</span>
              <span style={{ fontSize: 12, color: t.muted, fontFamily: t.font }}>{desc}</span>
            </div>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
