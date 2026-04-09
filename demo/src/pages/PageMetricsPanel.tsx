import { MetricsPanel } from 'tinytsdk/react';
import { PageTitle, PageSection, LiveExample, PropsTable, Divider } from '../components.js';

export function PageMetricsPanel() {
  return (
    <div>
      <PageTitle
        title="MetricsPanel"
        badge="component"
        desc="Vertical metrics card with bars, load score, and animated load average arrows. Three size variants and optional two-column layout."
      />

      <PageSection title="Size variants">
        <LiveExample
          title="size=&quot;s&quot; — minimal"
          description="Compact: percentage values only, no bars."
          code={`<MetricsPanel size="s" />`}
          center
        >
          <MetricsPanel size="s" />
        </LiveExample>

        <LiveExample
          title="size=&quot;m&quot; — default"
          description="Full bars, load score, net traffic."
          code={`<MetricsPanel size="m" />`}
          center
        >
          <MetricsPanel size="m" />
        </LiveExample>

        <LiveExample
          title="size=&quot;l&quot; — full detail"
          description="Full labels, tooltips, disk bytes, OS info, hostname."
          code={`<MetricsPanel size="l" />`}
          center
        >
          <MetricsPanel size="l" />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Two-column layout">
        <LiveExample
          title="columns={2}"
          description="cpu/mem/disk in the left column, load/net/proc + footer in the right."
          code={`<MetricsPanel columns={2} />`}
          center
        >
          <MetricsPanel columns={2} />
        </LiveExample>

        <LiveExample
          title="columns={2} size=&quot;l&quot;"
          description="Full detail in two columns."
          code={`<MetricsPanel columns={2} size="l" />`}
          center
        >
          <MetricsPanel columns={2} size="l" />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Custom metric order">
        <LiveExample
          title="metrics prop — subset and order"
          description="Metrics render top-to-bottom in the order of the array."
          code={`<MetricsPanel metrics={['load', 'cpu', 'net']} />`}
          center
        >
          <MetricsPanel metrics={['load', 'cpu', 'net']} />
        </LiveExample>

        <LiveExample
          title="CPU + Mem only"
          description="Minimal subset for embedding in tight layouts."
          code={`<MetricsPanel metrics={['cpu', 'mem']} size="s" />`}
          center
        >
          <MetricsPanel metrics={['cpu', 'mem']} size="s" />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Load average arrows">
        <LiveExample
          title="Animated NFS-style arrows"
          description="▶▶▶▶▶▶▶▶ wave left-to-right (red) when load is rising, ◀◀◀◀◀◀◀◀ right-to-left (green) when falling. Determined by load_1min vs load_15min."
          code={`// Arrows appear automatically in the load row when metrics={['load']} or default
<MetricsPanel metrics={['load']} size="m" />`}
          center
        >
          <MetricsPanel metrics={['load']} size="m" />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Theme override">
        <LiveExample
          title="Per-component theme"
          description="Override tokens without a ThemeProvider."
          code={`<MetricsPanel
  theme={{ bg: '#0d1117', cpu: '#f97316', mem: '#a78bfa', border: '#21262d' }}
  size="m"
/>`}
          center
        >
          <MetricsPanel
            theme={{ bg: '#0d1117', cpu: '#f97316', mem: '#a78bfa', border: '#21262d' }}
            size="m"
          />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'size', type: '"s" | "m" | "l"', default: '"m"', description: 's: % only; m: bars + load; l: full labels, OS info' },
            { name: 'columns', type: '1 | 2', default: '1', description: '2 = two-column split (cpu/mem/disk | load/net/proc)' },
            { name: 'metrics', type: 'MetricType[]', default: 'all', description: 'Metrics to display, rendered in array order' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Per-component token overrides' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
          ]}
        />
      </PageSection>
    </div>
  );
}
