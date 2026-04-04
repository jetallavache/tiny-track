import { useState, ReactNode } from 'react';
import { useTheme } from 'tinytsdk/react';

// ---------------------------------------------------------------------------
// CodeBlock
// ---------------------------------------------------------------------------
export function CodeBlock({ code }: { code: string }) {
  const t = useTheme();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{ position: 'relative', borderRadius: t.radius, overflow: 'hidden', border: `1px solid ${t.border}` }}>
      <button
        onClick={copy}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontSize: 10,
          background: t.btnBg,
          border: `1px solid ${t.border}`,
          borderRadius: t.radius,
          color: t.muted,
          cursor: 'pointer',
          padding: '2px 8px',
          fontFamily: t.font,
        }}
      >
        {copied ? '✓ copied' : 'copy'}
      </button>
      <pre
        style={{
          margin: 0,
          padding: '14px 16px',
          overflowX: 'auto',
          background: t.surface,
          color: t.text,
          fontFamily: '"JetBrains Mono","Fira Code",monospace',
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PropsTable
// ---------------------------------------------------------------------------
export interface PropRow {
  name: string;
  type: string;
  default?: string;
  description: string;
}

export function PropsTable({ rows }: { rows: PropRow[] }) {
  const t = useTheme();
  const th: React.CSSProperties = {
    padding: '6px 12px',
    textAlign: 'left',
    fontSize: 11,
    color: t.muted,
    fontWeight: 600,
    borderBottom: `1px solid ${t.border}`,
    background: t.surface,
    whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: 12,
    color: t.text,
    borderBottom: `1px solid ${t.divider}`,
    verticalAlign: 'top',
  };
  const code: React.CSSProperties = {
    fontFamily: '"JetBrains Mono","Fira Code",monospace',
    fontSize: 11,
    background: t.btnBg,
    padding: '1px 5px',
    borderRadius: 4,
    color: t.cpu,
  };
  return (
    <div style={{ overflowX: 'auto', borderRadius: t.radius, border: `1px solid ${t.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: t.font }}>
        <thead>
          <tr>
            {['Prop', 'Type', 'Default', 'Description'].map((h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} style={{ background: 'transparent' }}>
              <td style={td}>
                <code style={code}>{r.name}</code>
              </td>
              <td style={td}>
                <code style={{ ...code, color: t.mem }}>{r.type}</code>
              </td>
              <td style={td}>
                <code style={{ ...code, color: t.muted }}>{r.default ?? '—'}</code>
              </td>
              <td style={{ ...td, color: t.muted }}>{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section / PageLayout helpers
// ---------------------------------------------------------------------------
export function PageSection({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: t.muted,
          marginBottom: 12,
          fontFamily: t.font,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Preview({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: 20,
        marginTop: 8,
      }}
    >
      {children}
    </div>
  );
}

export function PageTitle({ title, badge, desc }: { title: string; badge?: string; desc: string }) {
  const t = useTheme();
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: t.text, margin: 0, fontFamily: t.font }}>{title}</h1>
        {badge && (
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              background: t.cpu + '22',
              color: t.cpu,
              borderRadius: 99,
              border: `1px solid ${t.cpu}44`,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <p style={{ fontSize: 14, color: t.muted, margin: 0, lineHeight: 1.7, fontFamily: t.font }}>{desc}</p>
    </div>
  );
}

export function Divider() {
  const t = useTheme();
  return <div style={{ height: 1, background: t.divider, margin: '32px 0' }} />;
}
