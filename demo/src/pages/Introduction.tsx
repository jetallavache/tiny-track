import { useTheme } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, Divider } from '../components.js';

export function Introduction() {
  const t = useTheme();
  return (
    <div>
      <PageTitle
        title="TinyTrack SDK"
        badge="v0.5.1"
        desc="Lightweight WebSocket client + React components for real-time Linux system metrics. Connect to a TinyTrack gateway and get live CPU, memory, disk, network and load data in your app."
      />

      <PageSection title="What's included">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { name: 'TinyTrackClient', desc: 'TypeScript WebSocket client with auto-reconnect' },
            { name: 'TinyTrackProvider', desc: 'React context provider with handshake & sysinfo' },
            { name: 'MetricsBar', desc: 'Compact single-line status bar for headers/footers' },
            { name: 'MetricsPanel', desc: 'Vertical panel with all key metrics' },
            { name: 'Dashboard', desc: 'Full dashboard with sparklines and WS console' },
            { name: 'TimeSeriesChart', desc: 'SVG line chart per metric and ring level' },
            { name: 'Timeline', desc: 'Scrollable bar chart across L1/L2/L3 ring buffers' },
          ].map((item) => (
            <div
              key={item.name}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: t.radius,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: t.font, marginBottom: 4 }}>
                {item.name}
              </div>
              <div style={{ fontSize: 12, color: t.muted, fontFamily: t.font, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </PageSection>

      <Divider />

      <PageSection title="Quick start">
        <CodeBlock
          code={`import { TinyTrackProvider, Dashboard } from 'tinytsdk/react';

export default function App() {
  return (
    <TinyTrackProvider url="ws://localhost:25015">
      <Dashboard />
    </TinyTrackProvider>
  );
}`}
        />
      </PageSection>

      <PageSection title="Protocol overview">
        <p style={{ fontSize: 13, color: t.muted, fontFamily: t.font, lineHeight: 1.7, marginBottom: 12 }}>
          TinyTrack uses a custom binary protocol over WebSocket. On connect, the SDK performs a handshake:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['1', 'connect', 'WebSocket connection established'],
            ['2', 'CMD_GET_SYS_INFO', 'Request hostname, OS, uptime, ring buffer config'],
            ['3', 'CMD_GET_SNAPSHOT', 'Request current metrics snapshot'],
            ['4', 'PKT_METRICS stream', 'Server pushes metrics at configured interval'],
          ].map(([n, cmd, desc]) => (
            <div
              key={n}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '8px 12px',
                background: t.surface,
                borderRadius: t.radius,
                border: `1px solid ${t.divider}`,
              }}
            >
              <span style={{ fontSize: 10, color: t.faint, minWidth: 16, fontFamily: 'monospace' }}>{n}</span>
              <code style={{ fontSize: 11, color: t.cpu, fontFamily: 'monospace', minWidth: 160 }}>{cmd}</code>
              <span style={{ fontSize: 12, color: t.muted, fontFamily: t.font }}>{desc}</span>
            </div>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
