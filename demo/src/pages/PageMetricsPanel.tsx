import { MetricsPanel } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, PropsTable, Preview, Divider } from '../components.js';

export function PageMetricsPanel() {
  return (
    <div>
      <PageTitle
        title="MetricsPanel"
        badge="component"
        desc="Vertical metrics card with three size variants: minimal, default and full-detail."
      />

      <PageSection title="Size variants">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Preview><MetricsPanel size="s" /></Preview>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0', fontFamily: 'monospace' }}>
              size="s" — CPU / Mem / Disk % only
            </p>
          </div>
          <div>
            <Preview><MetricsPanel size="m" /></Preview>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0', fontFamily: 'monospace' }}>
              size="m" — default: bars + load + net
            </p>
          </div>
          <div>
            <Preview><MetricsPanel size="l" /></Preview>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0', fontFamily: 'monospace' }}>
              size="l" — full labels, tooltips, OS info
            </p>
          </div>
        </div>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <CodeBlock
          code={`import { TinyTrackProvider, MetricsPanel } from 'tinytsdk/react';
import type { MetricType, SizeType } from 'tinytsdk/react';

<TinyTrackProvider url="ws://localhost:25015">
  {/* Minimal */}
  <MetricsPanel size="s" />

  {/* Default */}
  <MetricsPanel />

  {/* Full detail */}
  <MetricsPanel size="l" />

  {/* Custom metric subset */}
  <MetricsPanel metrics={['cpu', 'mem', 'load'] satisfies MetricType[]} />
</TinyTrackProvider>`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'size', type: '"s" | "m" | "l"', default: '"m"', description: 's: CPU/Mem/Disk % only; m: default with bars; l: full labels, tooltips, OS info' },
            { name: 'metrics', type: 'MetricType[]', default: 'all', description: 'Subset of metrics to display' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Override theme tokens for this component only' },
          ]}
        />
      </PageSection>
    </div>
  );
}
