import { useTheme, Dashboard } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, PropsTable, Preview, Divider } from '../components.js';

export function PageDashboard() {
  const t = useTheme();
  return (
    <div>
      <PageTitle
        title="Dashboard"
        badge="component"
        desc="Full-featured dashboard with CPU/memory bars, sparklines (expanded mode), disk, network, load average, alert badges, configurable refresh interval, Start/Stop streaming control, and a built-in WebSocket packet console."
      />

      <PageSection title="Compact mode">
        <Preview>
          <Dashboard mode="compact" style={{ maxWidth: 520 }} />
        </Preview>
      </PageSection>

      <PageSection title="Expanded mode">
        <Preview>
          <Dashboard mode="expanded" style={{ maxWidth: 520 }} />
        </Preview>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <CodeBlock
          code={`import { TinyTrackProvider, Dashboard } from 'tinytsdk/react';

<TinyTrackProvider url="ws://localhost:25015">
  {/* Compact (default) */}
  <Dashboard />

  {/* Expanded with sparklines */}
  <Dashboard mode="expanded" />

  {/* Custom history buffer */}
  <Dashboard historySize={120} />

  {/* Full width */}
  <Dashboard style={{ width: '100%' }} />
</TinyTrackProvider>`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            {
              name: 'mode',
              type: '"compact" | "expanded"',
              default: '"compact"',
              description: 'Compact shows bars only; expanded adds sparkline charts',
            },
            {
              name: 'historySize',
              type: 'number',
              default: '60',
              description: 'Number of samples to keep for sparklines',
            },
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

      <PageSection title="Built-in controls">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['⏸ stop / ▶ start', 'Send CMD_STOP / CMD_START to pause or resume the metrics stream'],
            ['⊞ / ⊟', 'Toggle between compact and expanded mode'],
            ['⊞ log', 'Open the WebSocket packet console (shows all → and ← packets)'],
            ['Refresh select', 'Send CMD_SET_INTERVAL to change the server push interval (1s–30s)'],
          ].map(([ctrl, desc]) => (
            <div
              key={ctrl}
              style={{
                display: 'flex',
                gap: 12,
                padding: '6px 12px',
                background: t.surface,
                borderRadius: t.radius,
                border: `1px solid ${t.divider}`,
              }}
            >
              <code style={{ fontSize: 11, color: t.cpu, fontFamily: 'monospace', minWidth: 120 }}>{ctrl}</code>
              <span style={{ fontSize: 12, color: t.muted, fontFamily: t.font }}>{desc}</span>
            </div>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
