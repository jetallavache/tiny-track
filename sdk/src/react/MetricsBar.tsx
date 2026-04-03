import { useMemo, useRef, CSSProperties } from 'react';
import { useMetrics } from './TinyTrackProvider.js';
import { fmtPct, fmtBytes, fmtLoad, detectAlerts, Alert } from './dashboard/utils.js';

export interface MetricsBarProps {
  className?: string;
  style?: CSSProperties;
  /** Show disk metric. Default: true */
  showDisk?: boolean;
  /** Show net metric. Default: true */
  showNet?: boolean;
}

export function MetricsBar({ className, style, showDisk = true, showNet = true }: MetricsBarProps) {
  const { metrics: m, connected } = useMetrics();
  const prevRef = useRef(m);
  const alerts = useMemo(() => {
    const a = m ? detectAlerts(m, prevRef.current) : [];
    prevRef.current = m;
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m]);

  return (
    <div className={className} style={{ ...s.root, ...style }}>
      {/* Status dot */}
      <span style={s.dot(connected ? '#22c55e' : '#6b7280')} title={connected ? 'live' : 'offline'}>
        ●
      </span>

      <Sep />

      {/* CPU */}
      <Metric label="CPU" value={m ? fmtPct(m.cpu) : '—'} color="#4ade80" />
      <Metric label="MEM" value={m ? fmtPct(m.mem) : '—'} color="#60a5fa" />

      {showDisk && <Metric label="DSK" value={m ? fmtPct(m.duUsage) : '—'} color="#f59e0b" />}

      <Sep />

      {/* Load */}
      <span style={s.label}>Load</span>
      <span style={s.value}>
        {m ? `${fmtLoad(m.load1)} / ${fmtLoad(m.load5)} / ${fmtLoad(m.load15)}` : '— / — / —'}
      </span>

      {showNet && (
        <>
          <Sep />
          <span style={{ ...s.value, color: '#34d399' }}>↑{m ? fmtBytes(m.netTx) : '—'}/s</span>
          <span style={{ ...s.value, color: '#60a5fa' }}>↓{m ? fmtBytes(m.netRx) : '—'}/s</span>
        </>
      )}

      {/* Proc */}
      <Sep />
      <span style={s.label}>Proc</span>
      <span style={s.value}>{m ? `${m.nrRunning}/${m.nrTotal}` : '—'}</span>

      {/* Alerts (inline badges) */}
      {alerts.length > 0 && (
        <>
          <Sep />
          {alerts.map((a: Alert) => (
            <span key={a.id} style={s.badge(a.level)}>
              {a.label}
            </span>
          ))}
        </>
      )}
    </div>
  );
}

function Sep() {
  return <span style={{ color: '#374151', userSelect: 'none' }}>│</span>;
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <>
      <span style={s.label}>{label}</span>
      <span style={{ ...s.value, color }}>{value}</span>
    </>
  );
}

const s = {
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: 11,
    background: '#111827',
    color: '#e5e7eb',
    border: '1px solid #1f2937',
    borderRadius: 4,
    padding: '2px 10px',
    whiteSpace: 'nowrap' as const,
    boxSizing: 'border-box' as const,
    height: 24,
  },
  dot: (color: string) => ({ color, fontSize: 8, lineHeight: 1 }),
  label: { color: '#6b7280', fontSize: 10 },
  value: { color: '#f3f4f6' },
  badge: (level: 'warn' | 'crit' | 'ok') => ({
    fontSize: 9,
    padding: '0 5px',
    borderRadius: 3,
    background: level === 'crit' ? '#7f1d1d' : level === 'ok' ? '#14532d' : '#78350f',
    color: level === 'crit' ? '#fca5a5' : level === 'ok' ? '#86efac' : '#fcd34d',
  }),
} as const;
