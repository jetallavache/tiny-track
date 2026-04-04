import { CSSProperties } from 'react';
import { useMetrics } from './TinyTrackProvider.js';
import { useTheme, TtTheme, themeStyles } from './theme.js';
import { fmtPct, fmtBytes, fmtLoad, bar } from './dashboard/utils.js';

export interface MetricsPanelProps {
  className?: string;
  style?: CSSProperties;
  theme?: Partial<TtTheme>;
}

function fmtUptimeSec(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function MetricsPanel({ className, style, theme: themeProp }: MetricsPanelProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);
  const { metrics: m, connected, sysinfo } = useMetrics();

  return (
    <div className={className} style={{ ...s.root, width: 'fit-content', gap: 4, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={s.badge(connected ? t.ok : t.crit)}>{connected ? '● live' : '○ off'}</span>
        {sysinfo && <span style={{ color: t.muted, fontSize: 11 }}>{sysinfo.hostname}</span>}
      </div>

      {sysinfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={s.label}>Uptime</span>
          <span style={{ ...s.numval, color: t.ok }}>{fmtUptimeSec(sysinfo.uptimeSec)}</span>
        </div>
      )}

      <div style={s.divider} />

      <Row label="CPU" value={m ? fmtPct(m.cpu) : '—'} bar={m ? bar(m.cpu) : null} color={t.cpu} s={s} />
      <Row label="Mem" value={m ? fmtPct(m.mem) : '—'} bar={m ? bar(m.mem) : null} color={t.mem} s={s} />
      <Row label="Disk" value={m ? fmtPct(m.duUsage) : '—'} bar={m ? bar(m.duUsage) : null} color={t.disk} s={s} />

      <div style={s.divider} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ ...s.label, minWidth: 36 }}>Load</span>
        <span style={{ ...s.numval, color: t.load }}>{m ? fmtLoad(m.load1) : '—'}</span>
        <span style={{ color: t.faint }}>/</span>
        <span style={{ ...s.numval, color: t.muted }}>{m ? fmtLoad(m.load5) : '—'}</span>
        <span style={{ color: t.faint }}>/</span>
        <span style={{ ...s.numval, color: t.muted }}>{m ? fmtLoad(m.load15) : '—'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ ...s.label, minWidth: 36 }}>Proc</span>
        <span style={s.numval}>{m ? `${m.nrRunning} / ${m.nrTotal}` : '—'}</span>
      </div>

      <div style={s.divider} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ ...s.label, minWidth: 36 }}>Net ↑</span>
        <span style={{ ...s.numval, color: t.net }}>{m ? fmtBytes(m.netTx) + '/s' : '—'}</span>
        <span style={{ color: t.faint }}>↓</span>
        <span style={{ ...s.numval, color: t.mem }}>{m ? fmtBytes(m.netRx) + '/s' : '—'}</span>
      </div>

      {m && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ ...s.label, minWidth: 36 }}>Disk</span>
          <span style={{ ...s.numval, minWidth: 120 }}>
            {fmtBytes(m.duTotal - m.duFree)} / {fmtBytes(m.duTotal)}
          </span>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bar: barStr,
  color,
  s,
}: {
  label: string;
  value: string;
  bar: string | null;
  color: string;
  s: ReturnType<typeof themeStyles>;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ ...s.label, minWidth: 36 }}>{label}</span>
      <span style={{ color, letterSpacing: 1, minWidth: 72, fontFamily: '"JetBrains Mono","Fira Code",monospace' }}>
        {barStr ?? '        '}
      </span>
      <span style={{ ...s.numval, color }}>{value}</span>
    </div>
  );
}
