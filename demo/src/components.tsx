import { useState, ReactNode } from 'react';
import { useTheme } from 'tinytsdk/react';

/* Minimal regex-based TypeScript/TSX syntax highlighter. */
function highlight(code: string): { text: string; color?: string }[] {
  const tokens: { text: string; color?: string }[] = [];
  const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(?:import|export|from|type|interface|const|let|var|function|return|if|else|new|async|await|default|extends|implements|class|typeof|keyof|as|in|of)\b)|(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|((?:\b(?:string|number|boolean|void|null|undefined|never|any|unknown)\b)|(?:\b[A-Z][A-Za-z0-9]*\b))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) tokens.push({ text: code.slice(last, m.index) });
    if (m[1]) tokens.push({ text: m[1], color: '#a3e635' });       /* string */
    else if (m[2]) tokens.push({ text: m[2], color: '#818cf8' });   /* keyword */
    else if (m[3] || m[4]) tokens.push({ text: m[3] || m[4], color: '#6b7280' }); /* comment */
    else if (m[5]) tokens.push({ text: m[5], color: '#38bdf8' });   /* type/ctor */
    last = m.index + m[0].length;
  }
  if (last < code.length) tokens.push({ text: code.slice(last) });
  return tokens;
}

/* ---------------------------------------------------------------------------
 * CodeBlock
 * ------------------------------------------------------------------------- */
export function CodeBlock({ code }: { code: string }) {
  const t = useTheme();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const tokens = highlight(code.trim());
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
        <code>
          {tokens.map((tok, i) =>
            tok.color
              ? <span key={i} style={{ color: tok.color }}>{tok.text}</span>
              : tok.text
          )}
        </code>
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

export function Preview({ children, fullWidth }: { children: ReactNode; fullWidth?: boolean }) {
  const t = useTheme();
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: 20,
        marginTop: 8,
        overflowX: 'auto',
        width: fullWidth ? '100%' : undefined,
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}

/** Responsive grid for side-by-side component previews. */
export function PreviewGrid({ children, minWidth = 260 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap: 12 }}>
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

/* ---------------------------------------------------------------------------
 * LiveExample — preview + code tabs, like MUI/Radix docs
 * ------------------------------------------------------------------------- */
export function LiveExample({
  title,
  description,
  code,
  children,
  previewBg,
  center = false,
}: {
  title?: string;
  description?: string;
  code: string;
  children: ReactNode;
  previewBg?: string;
  center?: boolean;
}) {
  const t = useTheme();
  const [tab, setTab] = useState<'preview' | 'code'>('preview');

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12,
    padding: '6px 14px',
    background: 'transparent',
    border: 'none',
    borderBottom: active ? `2px solid ${t.accent ?? t.cpu}` : '2px solid transparent',
    color: active ? t.text : t.muted,
    cursor: 'pointer',
    fontFamily: t.font,
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ marginBottom: 32, border: `1px solid ${t.border}`, borderRadius: t.radius, overflow: 'hidden' }}>
      {(title || description) && (
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, background: t.surface }}>
          {title && <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: t.font }}>{title}</div>}
          {description && <div style={{ fontSize: 12, color: t.muted, marginTop: 2, fontFamily: t.font }}>{description}</div>}
        </div>
      )}
      <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, background: t.surface }}>
        <button style={tabStyle(tab === 'preview')} onClick={() => setTab('preview')}>Preview</button>
        <button style={tabStyle(tab === 'code')} onClick={() => setTab('code')}>Code</button>
      </div>
      {tab === 'preview' ? (
        <div style={{
          padding: 24,
          background: previewBg ?? t.bg,
          display: center ? 'flex' : 'block',
          justifyContent: center ? 'center' : undefined,
          alignItems: center ? 'flex-start' : undefined,
          flexWrap: center ? 'wrap' as const : undefined,
          gap: center ? 16 : undefined,
          overflowX: 'auto',
        }}>
          {children}
        </div>
      ) : (
        <CodeBlock code={code} />
      )}
    </div>
  );
}
