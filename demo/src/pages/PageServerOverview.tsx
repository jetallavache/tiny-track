import { useTheme } from 'tinytsdk/react';

export function PageServerOverview() {
  const t = useTheme();

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 24px', color: t.text }}>Server Overview</h1>
      
      <p style={{ fontSize: 14, color: t.muted, lineHeight: 1.8, marginBottom: 24 }}>
        TinyTrack server consists of two components:
      </p>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: t.text }}>tinytd — Metrics Collector</h2>
        <p style={{ fontSize: 13, color: t.muted, lineHeight: 1.8, margin: 0 }}>
          Reads /proc filesystem and collects system metrics. Writes to shared memory ring buffers (L1, L2, L3).
          Runs as systemd service. Minimal overhead: &lt; 1% CPU, &lt; 10 MB RAM.
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: t.text }}>tinytrack — WebSocket Gateway</h2>
        <p style={{ fontSize: 13, color: t.muted, lineHeight: 1.8, margin: 0 }}>
          HTTP/WebSocket server on port 25015. Reads metrics from shared memory and streams to connected clients.
          Supports binary protocol v2 with authentication, compression, and multiple ring buffer levels.
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: t.text }}>Ring Buffers</h2>
        <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 12px' }}>
            <strong style={{ color: t.text }}>L1 (1 second resolution, 1 hour retention)</strong><br />
            Real-time metrics. Latest 3600 snapshots.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            <strong style={{ color: t.text }}>L2 (1 minute resolution, 24 hour retention)</strong><br />
            Aggregated (avg/min/max) metrics. Latest 1440 snapshots.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: t.text }}>L3 (1 hour resolution, 30 day retention)</strong><br />
            Long-term trends. Latest 720 snapshots.
          </p>
        </div>
      </div>

      <div style={{ padding: 16, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
        <p style={{ fontSize: 12, color: t.muted, margin: 0, lineHeight: 1.6 }}>
          See <a href="#" style={{ color: t.cpu, textDecoration: 'none' }}>Installation</a> for deployment options (host, Docker, Kubernetes).
        </p>
      </div>
    </div>
  );
}
