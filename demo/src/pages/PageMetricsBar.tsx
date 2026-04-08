import { MetricsBar } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, PropsTable, Preview, Divider } from '../components.js';

export function PageMetricsBar() {
  return (
    <div>
      <PageTitle
        title="MetricsBar"
        badge="component"
        desc="Compact single-line status bar with fixed-position alert lamps. Alert indicators are always present — their color changes without shifting any other content."
      />

      <PageSection title="Size variants">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Preview><MetricsBar size="s" /></Preview>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0', fontFamily: 'monospace' }}>
              size="s" — minimal: status + alert lamps + CPU + Mem
            </p>
          </div>
          <div>
            <Preview><MetricsBar size="m" style={{ width: '100%' }} /></Preview>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0', fontFamily: 'monospace' }}>
              size="m" — default: all metrics, abbreviated labels
            </p>
          </div>
          <div>
            <Preview><MetricsBar size="l" style={{ width: '100%' }} /></Preview>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0', fontFamily: 'monospace' }}>
              size="l" — full labels, tooltips, disk free bytes
            </p>
          </div>
          <div>
            <Preview><MetricsBar metrics={['cpu', 'mem']} /></Preview>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0', fontFamily: 'monospace' }}>
              metrics={`['cpu', 'mem']`} — custom metric subset
            </p>
          </div>
        </div>
      </PageSection>

      <Divider />

      <PageSection title="Alert lamps">
        <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          Five indicator dots are always rendered (cpu, mem, disk, load, spike).
          They act as "lamps" — grey when idle, yellow on warning, red on critical.
          No content shifts when alerts appear or disappear.
        </p>
        <Preview><MetricsBar size="l" metrics={[]} style={{ width: '100%' }} /></Preview>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <CodeBlock
          code={`import { TinyTrackProvider, MetricsBar } from 'tinytsdk/react';
import type { MetricType, SizeType } from 'tinytsdk/react';

<TinyTrackProvider url="ws://localhost:25015">
  {/* Minimal */}
  <MetricsBar size="s" />

  {/* Default */}
  <MetricsBar />

  {/* Full detail with tooltips */}
  <MetricsBar size="l" style={{ width: '100%' }} />

  {/* Custom metric subset */}
  <MetricsBar metrics={['cpu', 'mem'] satisfies MetricType[]} />
</TinyTrackProvider>`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'size', type: '"s" | "m" | "l"', default: '"m"', description: 's: minimal (lamps + CPU/Mem), m: default, l: full labels + tooltips + disk bytes' },
            { name: 'metrics', type: 'MetricType[]', default: 'all', description: 'Which metrics to display: cpu, mem, net, disk, load, proc' },
            { name: 'showAlerts', type: 'boolean', default: 'true', description: 'Show alert lamps (cpu, mem, disk, load, spike)' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Override theme tokens for this component only' },
          ]}
        />
      </PageSection>
    </div>
  );
}
