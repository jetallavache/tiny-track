import { useTheme } from 'tinytsdk/react';

export function PageCliOverview() {
  const t = useTheme();

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 24px', color: t.text }}>CLI — tiny-cli</h1>
      
      <p style={{ fontSize: 14, color: t.muted, lineHeight: 1.8, marginBottom: 24 }}>
        Terminal UI for monitoring system metrics. Reads directly from shared memory ring buffers.
        No network overhead. Real-time ncurses dashboard.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: t.text }}>Commands</h2>
      <div style={{ fontSize: 13, color: t.muted, lineHeight: 2 }}>
        <p><code style={{ background: t.surface, padding: '2px 6px', borderRadius: 2, color: t.text }}>tiny-cli status</code> — Daemon status</p>
        <p><code style={{ background: t.surface, padding: '2px 6px', borderRadius: 2, color: t.text }}>tiny-cli metrics</code> — Current snapshot</p>
        <p><code style={{ background: t.surface, padding: '2px 6px', borderRadius: 2, color: t.text }}>tiny-cli history l1</code> — Last hour (1s resolution)</p>
        <p><code style={{ background: t.surface, padding: '2px 6px', borderRadius: 2, color: t.text }}>tiny-cli history l2</code> — Last 24h (1min resolution)</p>
        <p><code style={{ background: t.surface, padding: '2px 6px', borderRadius: 2, color: t.text }}>tiny-cli history l3</code> — Last 30 days (1hr resolution)</p>
        <p><code style={{ background: t.surface, padding: '2px 6px', borderRadius: 2, color: t.text }}>tiny-cli dashboard</code> — Live ncurses dashboard</p>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: t.text }}>Dashboard</h2>
      <p style={{ fontSize: 13, color: t.muted, lineHeight: 1.8, marginBottom: 24 }}>
        Real-time metrics display with keyboard controls. Shows CPU, memory, network, disk, load average.
        Supports zooming, filtering, and exporting to CSV.
      </p>

      <div style={{ padding: 16, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
        <p style={{ fontSize: 12, color: t.muted, margin: 0 }}>
          Installed automatically with server. Run <code style={{ background: t.bg, padding: '2px 4px', borderRadius: 2 }}>tiny-cli dashboard</code> to start.
        </p>
      </div>
    </div>
  );
}
