import { useTheme } from 'tinytsdk/react';

export function PageServerConfig() {
  const t = useTheme();

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 24px', color: t.text }}>Configuration</h1>
      
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: t.text }}>tinytd (Collector)</h2>
      <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.8, marginBottom: 24 }}>
        <p><strong style={{ color: t.text }}>Collection Interval</strong> — Default 1 second. Configurable via CMD_SET_INTERVAL.</p>
        <p><strong style={{ color: t.text }}>Ring Buffer Sizes</strong> — L1: 3600 slots, L2: 1440 slots, L3: 720 slots.</p>
        <p><strong style={{ color: t.text }}>Aggregation</strong> — L2 aggregates L1 every 60s. L3 aggregates L2 every 3600s.</p>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: t.text }}>tinytrack (Gateway)</h2>
      <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.8, marginBottom: 24 }}>
        <p><strong style={{ color: t.text }}>Port</strong> — Default 25015. Set via TT_PORT env var.</p>
        <p><strong style={{ color: t.text }}>WebSocket Path</strong> — /websocket or /v1/stream</p>
        <p><strong style={{ color: t.text }}>Authentication</strong> — Optional token via CMD_AUTH.</p>
        <p><strong style={{ color: t.text }}>TLS</strong> — Supported via environment variables.</p>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: t.text }}>Systemd Service</h2>
      <pre style={{ background: t.surface, padding: 12, borderRadius: t.radius, overflow: 'auto', fontSize: 12, color: t.text }}>
        <code>systemctl status tinytd
systemctl status tinytrack
systemctl restart tinytd
journalctl -u tinytd -f</code>
      </pre>

      <div style={{ padding: 16, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
        <p style={{ fontSize: 12, color: t.muted, margin: 0 }}>
          For detailed configuration, see <a href="#" style={{ color: t.cpu, textDecoration: 'none' }}>docs/en/configuration.md</a>
        </p>
      </div>
    </div>
  );
}
