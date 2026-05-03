import { useTheme } from 'tinytsdk/react';

export function Footer() {
  const t = useTheme();

  return (
    <footer
      style={{
        borderTop: `1px solid ${t.border}`,
        padding: '24px 40px',
        background: t.surface,
        fontSize: 12,
        color: t.muted,
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
        <div>
          <div style={{ fontWeight: 700, color: t.text, marginBottom: 12 }}>TinyTrack</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>
            Lightweight Linux system metrics daemon with real-time WebSocket streaming.
          </p>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            MIT License
          </p>
        </div>

        <div>
          <div style={{ fontWeight: 700, color: t.text, marginBottom: 12 }}>Quick Links</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', lineHeight: 1.8 }}>
            <li><a href="#" style={{ color: t.cpu, textDecoration: 'none' }}>GitHub</a></li>
            <li><a href="#" style={{ color: t.cpu, textDecoration: 'none' }}>npm (tinytsdk)</a></li>
            <li><a href="#" style={{ color: t.cpu, textDecoration: 'none' }}>npm (tinytsdk-lite)</a></li>
            <li><a href="#" style={{ color: t.cpu, textDecoration: 'none' }}>Docker Hub</a></li>
          </ul>
        </div>

        <div>
          <div style={{ fontWeight: 700, color: t.text, marginBottom: 12 }}>Documentation</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', lineHeight: 1.8 }}>
            <li><a href="#" style={{ color: t.cpu, textDecoration: 'none' }}>Server Docs</a></li>
            <li><a href="#" style={{ color: t.cpu, textDecoration: 'none' }}>SDK Docs</a></li>
            <li><a href="#" style={{ color: t.cpu, textDecoration: 'none' }}>Architecture</a></li>
            <li><a href="#" style={{ color: t.cpu, textDecoration: 'none' }}>Troubleshooting</a></li>
          </ul>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 24, paddingTop: 16, textAlign: 'center' }}>
        <p style={{ margin: 0 }}>
          © 2026 TinyTrack. Built with ❤️ for Linux.
        </p>
      </div>
    </footer>
  );
}
