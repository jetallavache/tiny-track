import { useTheme } from 'tinytsdk/react';

export function PageServerDocker() {
  const t = useTheme();

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 24px', color: t.text }}>Docker Deployment</h1>
      
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: t.text }}>Docker Run</h2>
      <pre style={{ background: t.surface, padding: 12, borderRadius: t.radius, overflow: 'auto', fontSize: 12, color: t.text }}>
        <code>docker run -d --name tinytrack \
  -p 25015:25015 \
  -v /proc:/host/proc:ro \
  -v /:/host/rootfs:ro \
  -v /dev/shm:/dev/shm \
  -e TT_PROC_ROOT=/host/proc \
  -e TT_ROOTFS_PATH=/host/rootfs \
  jetallavache/tinytrack:latest</code>
      </pre>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: t.text }}>Docker Compose</h2>
      <pre style={{ background: t.surface, padding: 12, borderRadius: t.radius, overflow: 'auto', fontSize: 12, color: t.text }}>
        <code>{`services:
  tinytrack:
    image: jetallavache/tinytrack:latest
    ports:
      - "25015:25015"
    volumes:
      - /proc:/host/proc:ro
      - /:/host/rootfs:ro
      - /dev/shm:/dev/shm
    environment:
      TT_PROC_ROOT: /host/proc
      TT_ROOTFS_PATH: /host/rootfs
    restart: unless-stopped`}</code>
      </pre>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: t.text }}>Environment Variables</h2>
      <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.8 }}>
        <p><strong style={{ color: t.text }}>TT_PROC_ROOT</strong> — Path to /proc (default: /proc)</p>
        <p><strong style={{ color: t.text }}>TT_ROOTFS_PATH</strong> — Path to root filesystem (default: /)</p>
        <p><strong style={{ color: t.text }}>TT_PORT</strong> — WebSocket port (default: 25015)</p>
      </div>
    </div>
  );
}
