import { useTheme } from 'tinytsdk/react';

export function PageServerInstall() {
  const t = useTheme();

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 24px', color: t.text }}>Installation</h1>
      
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: t.text }}>One-line Install (Host)</h2>
      <pre style={{ background: t.surface, padding: 12, borderRadius: t.radius, overflow: 'auto', fontSize: 12, color: t.text }}>
        <code>curl -fsSL https://raw.githubusercontent.com/jetallavache/tinytrack/main/install.sh | bash</code>
      </pre>
      <p style={{ fontSize: 13, color: t.muted, marginBottom: 24 }}>
        Builds from source, installs binaries, starts tinytd + tinytrack as systemd services.
        Supports Debian/Ubuntu, Fedora/RHEL, Arch.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: t.text }}>Docker</h2>
      <pre style={{ background: t.surface, padding: 12, borderRadius: t.radius, overflow: 'auto', fontSize: 12, color: t.text }}>
        <code>docker run -d --name tinytrack -p 25015:25015 \
  -v /proc:/host/proc:ro \
  -v /:/host/rootfs:ro \
  -e TT_PROC_ROOT=/host/proc \
  -e TT_ROOTFS_PATH=/host/rootfs \
  jetallavache/tinytrack:latest</code>
      </pre>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: t.text }}>Kubernetes</h2>
      <p style={{ fontSize: 13, color: t.muted, marginBottom: 12 }}>
        Deploy as DaemonSet. See <a href="#" style={{ color: t.cpu, textDecoration: 'none' }}>Docker</a> page for YAML.
      </p>

      <div style={{ padding: 16, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
        <p style={{ fontSize: 12, color: t.muted, margin: 0 }}>
          Server available at <code style={{ background: t.bg, padding: '2px 4px', borderRadius: 2 }}>ws://your-host:25015/websocket</code>
        </p>
      </div>
    </div>
  );
}
