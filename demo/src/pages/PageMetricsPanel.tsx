import { useTheme, MetricsPanel } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, PropsTable, Preview, Divider } from '../components.js';

export function PageMetricsPanel() {
  const t = useTheme();
  return (
    <div>
      <PageTitle
        title="MetricsPanel"
        badge="component"
        desc="Compact vertical panel displaying all key metrics: CPU, memory, disk, load average, process count, network I/O and disk usage. Shows hostname and system uptime from sysinfo."
      />

      <PageSection title="Preview">
        <Preview>
          <MetricsPanel />
        </Preview>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <CodeBlock
          code={`import { TinyTrackProvider, MetricsPanel } from 'tinytsdk/react';

<TinyTrackProvider url="ws://localhost:25015">
  <MetricsPanel />
</TinyTrackProvider>

// With custom width
<MetricsPanel style={{ width: 240 }} />

// With theme override
<MetricsPanel theme={{ bg: 'transparent', border: 'none' }} />`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
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

      <PageSection title="Data displayed">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['Hostname', 'From PKT_SYS_INFO on connect'],
            ['Uptime', 'System uptime from /proc/uptime via PKT_SYS_INFO'],
            ['CPU / Mem / Disk', 'Percentage with ASCII bar (0–100%)'],
            ['Load avg', '1m / 5m / 15m (×100 fixed-point)'],
            ['Process count', 'Running / total'],
            ['Network', 'TX ↑ and RX ↓ in bytes/sec'],
            ['Disk usage', 'Used / total in human-readable bytes'],
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
              <span style={{ fontSize: 12, color: t.text, fontFamily: t.font, minWidth: 140 }}>{name}</span>
              <span style={{ fontSize: 12, color: t.muted, fontFamily: t.font }}>{desc}</span>
            </div>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
