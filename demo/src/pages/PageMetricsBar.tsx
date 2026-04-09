import { MetricsBar } from 'tinytsdk/react';
import { PageTitle, PageSection, LiveExample, PropsTable, Divider } from '../components.js';

export function PageMetricsBar() {
  return (
    <div>
      <PageTitle
        title="MetricsBar"
        badge="component"
        desc="Compact single-line status bar. Renders metrics as oval badges in the order defined by the metrics array. Alert lamps are always present — their color changes without shifting layout."
      />

      <PageSection title="Size variants">
        <LiveExample
          title="size=&quot;s&quot; — minimal"
          description="Icon labels, compact badges. Auto-selected on mobile."
          code={`<MetricsBar size="s" />`}
        >
          <MetricsBar size="s" />
        </LiveExample>

        <LiveExample
          title="size=&quot;m&quot; — default"
          description="Abbreviated text labels, all metrics."
          code={`<MetricsBar size="m" style={{ width: '100%' }} />`}
        >
          <MetricsBar size="m" style={{ width: '100%' }} />
        </LiveExample>

        <LiveExample
          title="size=&quot;l&quot; — full detail"
          description="Full labels, tooltips, net upload/download split."
          code={`<MetricsBar size="l" style={{ width: '100%' }} />`}
        >
          <MetricsBar size="l" style={{ width: '100%' }} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Custom metric order">
        <LiveExample
          title="metrics prop — subset and order"
          description="Metrics render left-to-right in the order of the array."
          code={`<MetricsBar metrics={['disk', 'cpu', 'net', 'mem']} />`}
        >
          <MetricsBar metrics={['disk', 'cpu', 'net', 'mem']} />
        </LiveExample>

        <LiveExample
          title="Single metric"
          description="Show only what you need."
          code={`<MetricsBar metrics={['cpu']} size="l" />`}
        >
          <MetricsBar metrics={['cpu']} size="l" />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="System info badges">
        <LiveExample
          title="sysInfo prop"
          description="Append system info fields as badges after metrics. Order is preserved."
          code={`<MetricsBar sysInfo={['hostname', 'os-type', 'uptime']} />`}
        >
          <MetricsBar sysInfo={['hostname', 'os-type', 'uptime']} />
        </LiveExample>

        <LiveExample
          title="Ring buffer info"
          description="Show L1/L2/L3 slot counts from the server handshake."
          code={`<MetricsBar metrics={['cpu', 'mem']} sysInfo={['ringbufInfo', 'uptime']} size="m" />`}
        >
          <MetricsBar metrics={['cpu', 'mem']} sysInfo={['ringbufInfo', 'uptime']} size="m" />
        </LiveExample>

        <LiveExample
          title="Metrics + all sysInfo fields"
          description="Full combination."
          code={`<MetricsBar
  size="m"
  metrics={['cpu', 'mem', 'disk']}
  sysInfo={['hostname', 'os-type', 'uptime', 'ringbufInfo']}
  style={{ width: '100%' }}
/>`}
        >
          <MetricsBar
            size="m"
            metrics={['cpu', 'mem', 'disk']}
            sysInfo={['hostname', 'os-type', 'uptime', 'ringbufInfo']}
            style={{ width: '100%' }}
          />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Alert lamps">
        <LiveExample
          title="Lamps only (no metrics)"
          description="Five indicator dots: cpu, mem, disk, load, spike. Always rendered, no layout shift."
          code={`<MetricsBar metrics={[]} size="l" style={{ width: '100%' }} />`}
        >
          <MetricsBar metrics={[]} size="l" style={{ width: '100%' }} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Theme override">
        <LiveExample
          title="Per-component theme"
          description="Override individual tokens without a ThemeProvider."
          code={`<MetricsBar
  theme={{ bg: '#0f172a', cpu: '#f472b6', mem: '#34d399', border: '#1e293b' }}
  size="m"
  style={{ width: '100%' }}
/>`}
        >
          <MetricsBar
            theme={{ bg: '#0f172a', cpu: '#f472b6', mem: '#34d399', border: '#1e293b' }}
            size="m"
            style={{ width: '100%' }}
          />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'size', type: '"s" | "m" | "l"', default: '"m"', description: 'Badge size: s=icon labels, m=abbreviated, l=full labels' },
            { name: 'metrics', type: 'MetricType[]', default: 'all', description: 'Metrics to display, rendered in array order' },
            { name: 'sysInfo', type: 'SysInfoType[]', default: '—', description: 'System info badges: "uptime" | "hostname" | "os-type" | "ringbufInfo"' },
            { name: 'showAlerts', type: 'boolean', default: 'true', description: 'Show alert lamp badges' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Per-component token overrides' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
          ]}
        />
      </PageSection>
    </div>
  );
}
