import { Dashboard } from 'tinytsdk/react';
import { PageTitle, PageSection, LiveExample, PropsTable, Divider } from '../components.js';

export function PageDashboard() {
  return (
    <div>
      <PageTitle
        title="Dashboard"
        badge="component"
        desc="Admin dashboard with SVG gauge speedometers for all 5 metrics, inline sparklines, ring buffer status, system info row, and keyboard shortcuts."
      />

      <PageSection title="Size variants">
        <LiveExample
          title='size="s" — compact gauges'
          description="Small gauges, no sparklines."
          code={`<Dashboard size="s" />`}
          center
        >
          <Dashboard size="s" style={{ maxWidth: 480 }} />
        </LiveExample>

        <LiveExample
          title='size="m" — default'
          description="Standard gauges with ring buffer status."
          code={`<Dashboard size="m" />`}
          center
        >
          <Dashboard size="m" style={{ maxWidth: 560 }} />
        </LiveExample>

        <LiveExample
          title='size="l" — large'
          description="Large gauges, more spacing."
          code={`<Dashboard size="l" />`}
          center
        >
          <Dashboard size="l" style={{ maxWidth: 640 }} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Expanded mode (sparklines)">
        <LiveExample
          title='mode="expanded"'
          description="Click any gauge or press 1–5 to focus a single sparkline. Press Esc to show all."
          code={`<Dashboard mode="expanded" />`}
          center
        >
          <Dashboard mode="expanded" style={{ maxWidth: 560 }} />
        </LiveExample>

        <LiveExample
          title="Focused sparkline (gauge click)"
          description="Click a gauge to expand only its sparkline inline."
          code={`<Dashboard mode="expanded" />
// Click CPU gauge → only CPU sparkline shown
// Press 1–5 to focus by keyboard`}
          center
        >
          <Dashboard mode="expanded" style={{ maxWidth: 560 }} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Metric subset">
        <LiveExample
          title="CPU + MEM only"
          description="Pass metrics prop to show a subset."
          code={`<Dashboard metrics={['cpu', 'mem']} />`}
          center
        >
          <Dashboard metrics={['cpu', 'mem']} style={{ maxWidth: 400 }} />
        </LiveExample>

        <LiveExample
          title="Without network"
          description="Hide NET gauge."
          code={`<Dashboard metrics={['cpu', 'mem', 'disk', 'load']} />`}
          center
        >
          <Dashboard metrics={['cpu', 'mem', 'disk', 'load']} style={{ maxWidth: 480 }} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="System info row">
        <LiveExample
          title="showSysInfo={false}"
          description="Hide the hostname / OS / uptime row."
          code={`<Dashboard showSysInfo={false} />`}
          center
        >
          <Dashboard showSysInfo={false} style={{ maxWidth: 560 }} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Theme override">
        <LiveExample
          title="Per-component theme"
          description="Override tokens without a ThemeProvider."
          code={`<Dashboard
  theme={{ bg: '#0d1117', cpu: '#f97316', mem: '#a78bfa', border: '#21262d' }}
/>`}
          center
        >
          <Dashboard
            theme={{ bg: '#0d1117', cpu: '#f97316', mem: '#a78bfa', border: '#21262d' }}
            style={{ maxWidth: 560 }}
          />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Keyboard shortcuts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 480 }}>
          {([
            ['s', 'Start / Stop streaming (CMD_START / CMD_STOP)'],
            ['r', 'Reset session min/max on all gauges'],
            ['1–5', 'Focus sparkline for CPU / MEM / DISK / LOAD / NET'],
            ['Esc', 'Show all sparklines (unfocus)'],
          ] as [string, string][]).map(([key, desc]) => (
            <div key={key} style={{ display: 'flex', gap: 12, padding: '6px 12px', background: 'var(--tt-surface, #1e2533)', borderRadius: 4, border: '1px solid var(--tt-border, #2a3347)' }}>
              <code style={{ fontSize: 11, color: '#4A90D9', fontFamily: 'monospace', minWidth: 48 }}>{key}</code>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{desc}</span>
            </div>
          ))}
        </div>
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'mode', type: '"compact" | "expanded"', default: '"compact"', description: 'compact: gauges only; expanded: gauges + sparklines' },
            { name: 'showSysInfo', type: 'boolean', default: 'true', description: 'Show/hide hostname · OS · uptime row' },
            { name: 'historySize', type: 'number', default: '60', description: 'Samples to keep for sparklines' },
            { name: 'metrics', type: 'MetricType[]', default: 'all 5', description: 'cpu | mem | disk | load | net — rendered in array order' },
            { name: 'size', type: '"s" | "m" | "l"', default: '"m"', description: 'Scale variant for gauges, fonts, spacing' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Per-component token overrides' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
          ]}
        />
      </PageSection>
    </div>
  );
}
