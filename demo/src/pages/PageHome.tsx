import { useTheme } from 'tinytsdk/react';

export function PageHome() {
  const t = useTheme();

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 16px', color: t.text }}>
          TinyTrack
        </h1>
        <p style={{ fontSize: 16, color: t.muted, margin: 0, lineHeight: 1.6 }}>
          Lightweight Linux system metrics daemon with real-time WebSocket streaming.
          Collects CPU, memory, network, disk, and load average — streams them live to any browser, dashboard, or custom app.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
        <div style={{ padding: 20, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: t.text }}>Server</h3>
          <p style={{ fontSize: 13, color: t.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
            Daemon + WebSocket gateway. Runs on any Linux VPS. &lt; 1% CPU, &lt; 10 MB RAM.
          </p>
          <a href="#" style={{ fontSize: 12, color: t.cpu, textDecoration: 'none' }}>
            Learn more →
          </a>
        </div>

        <div style={{ padding: 20, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: t.text }}>SDK</h3>
          <p style={{ fontSize: 13, color: t.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
            TypeScript client + React components. 2.8 KB core, 23.7 KB with React.
          </p>
          <a href="#" style={{ fontSize: 12, color: t.cpu, textDecoration: 'none' }}>
            Learn more →
          </a>
        </div>

        <div style={{ padding: 20, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: t.text }}>CLI</h3>
          <p style={{ fontSize: 13, color: t.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
            Terminal UI for monitoring. Real-time metrics, history, and system info.
          </p>
          <a href="#" style={{ fontSize: 12, color: t.cpu, textDecoration: 'none' }}>
            Learn more →
          </a>
        </div>

        <div style={{ padding: 20, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: t.text }}>Quick Start</h3>
          <p style={{ fontSize: 13, color: t.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
            Deploy server with Docker or one-line install. Connect SDK in minutes.
          </p>
          <a href="#" style={{ fontSize: 12, color: t.cpu, textDecoration: 'none' }}>
            Get started →
          </a>
        </div>
      </div>

      <div style={{ padding: 20, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: t.text }}>Features</h3>
        <ul style={{ fontSize: 13, color: t.muted, margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Real-time WebSocket streaming</li>
          <li>CPU, memory, network, disk, load average metrics</li>
          <li>Ring buffers: L1 (1s/1h), L2 (1min/24h), L3 (1hr/30d)</li>
          <li>React components + vanilla JS support</li>
          <li>CDN-ready IIFE bundle (2.8 KB gzip)</li>
          <li>Lightweight: &lt; 1% CPU, &lt; 10 MB RAM</li>
          <li>MIT License</li>
        </ul>
      </div>
    </div>
  );
}
