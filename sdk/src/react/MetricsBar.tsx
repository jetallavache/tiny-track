import { useMemo, useRef, CSSProperties } from 'react';
import { useMetrics } from './TinyTrackProvider.js';
import { useTheme, TtTheme, themeStyles } from './theme.js';
import { fmtPct, fmtBytes, fmtLoad, detectAlerts, Alert } from './dashboard/utils.js';

export interface MetricsBarProps {
  className?: string;
  style?: CSSProperties;
  showDisk?: boolean;
  showNet?: boolean;
  /** Override theme tokens */
  theme?: Partial<TtTheme>;
  /** Force mobile layout (auto-detected if not set) */
  compact?: boolean;
}

export function MetricsBar({
  className,
  style,
  showDisk = true,
  showNet = true,
  theme: themeProp,
  compact,
}: MetricsBarProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);
  const { metrics: m, connected } = useMetrics();
  const prevRef = useRef(m);
  const alerts = useMemo(() => {
    const a = m ? detectAlerts(m, prevRef.current) : [];
    prevRef.current = m;
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m]);

  // Auto-detect mobile if compact not forced
  const isMobile = compact ?? (typeof window !== 'undefined' && window.innerWidth < 640);

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isMobile ? 4 : 6,
        fontFamily: t.font,
        fontSize: isMobile ? 10 : 11,
        background: t.bg,
        color: t.text,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: isMobile ? '2px 8px' : '2px 10px',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        height: isMobile ? 22 : 24,
        ...style,
      }}
    >
      <span style={{ color: connected ? t.ok : t.muted, fontSize: 8 }} title={connected ? 'live' : 'offline'}>
        ●
      </span>
      <Sep t={t} />
      <Metric label="CPU" value={m ? fmtPct(m.cpu) : '—'} color={t.cpu} t={t} />
      <Metric label="MEM" value={m ? fmtPct(m.mem) : '—'} color={t.mem} t={t} />
      {showDisk && !isMobile && <Metric label="DSK" value={m ? fmtPct(m.duUsage) : '—'} color={t.disk} t={t} />}
      {!isMobile && (
        <>
          <Sep t={t} />
          <span style={{ color: t.muted, fontSize: 10 }}>Load</span>
          <span style={{ color: t.text, minWidth: 120, fontVariantNumeric: 'tabular-nums' }}>
            {m ? `${fmtLoad(m.load1)} / ${fmtLoad(m.load5)} / ${fmtLoad(m.load15)}` : '— / — / —'}
          </span>
        </>
      )}
      {showNet && !isMobile && (
        <>
          <Sep t={t} />
          <span style={{ color: t.net, minWidth: 20 }}>↑</span>
          <span style={{ color: t.net, minWidth: 72, fontVariantNumeric: 'tabular-nums' }}>
            {m ? fmtBytes(m.netTx) : '—'}/s
          </span>
          <span style={{ color: t.mem, minWidth: 20 }}>↓</span>
          <span style={{ color: t.mem, minWidth: 72, fontVariantNumeric: 'tabular-nums' }}>
            {m ? fmtBytes(m.netRx) : '—'}/s
          </span>
        </>
      )}
      {!isMobile && (
        <>
          <Sep t={t} />
          <span style={{ color: t.muted, fontSize: 10 }}>Proc</span>
          <span style={{ color: t.text, minWidth: 56, fontVariantNumeric: 'tabular-nums' }}>
            {m ? `${m.nrRunning}/${m.nrTotal}` : '—'}
          </span>
        </>
      )}
      {alerts.length > 0 && (
        <>
          <Sep t={t} />
          {alerts.map((a: Alert) => (
            <span key={a.id} style={s.alert(a.level)}>
              {a.label}
            </span>
          ))}
        </>
      )}
    </div>
  );
}

function Sep({ t }: { t: TtTheme }) {
  return <span style={{ color: t.faint, userSelect: 'none' }}>│</span>;
}

function Metric({ label, value, color, t }: { label: string; value: string; color: string; t: TtTheme }) {
  return (
    <>
      <span style={{ color: t.muted, fontSize: 10 }}>{label}</span>
      <span style={{ color, minWidth: 44, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </>
  );
}
