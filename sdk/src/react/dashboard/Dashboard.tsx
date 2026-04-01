import { useState, useEffect, useRef, CSSProperties } from 'react';
import { useTinyTrack } from '../TinyTrackProvider.js';
import { TtMetrics } from '../../client.js';
import { RING_L1 } from '../../proto.js';
import { fmtPct, fmtBytes, fmtLoad, fmtUptime, bar, detectAlerts } from './utils.js';
import { Sparkline } from './Sparkline.js';

export type DashboardMode = 'compact' | 'expanded';

export interface DashboardProps {
  mode?: DashboardMode;
  historySize?: number;
  className?: string;
  style?: CSSProperties;
}

const INTERVALS = [1000, 5000, 10000, 30000];
const INTERVAL_LABELS = ['1s', '5s', '10s', '30s'];

export function Dashboard({ mode: modeProp, historySize = 60, className, style }: DashboardProps) {
  const { client, metrics, stats, connected } = useTinyTrack();
  const [mode, setMode] = useState<DashboardMode>(modeProp ?? 'compact');
  const [intervalIdx, setIntervalIdx] = useState(1);
  const history = useRef<TtMetrics[]>([]);
  const prevMetrics = useRef<TtMetrics | null>(null);

  useEffect(() => {
    if (!metrics) return;
    history.current = [...history.current.slice(-(historySize - 1)), metrics];
    prevMetrics.current = metrics;
  }, [metrics, historySize]);

  useEffect(() => {
    client?.setInterval(INTERVALS[intervalIdx]);
  }, [client, intervalIdx]);

  useEffect(() => {
    if (connected && client) {
      client.getHistory(RING_L1, historySize);
    }
  }, [connected, client, historySize]);

  const s = css;
  const m = metrics;
  const alerts = m ? detectAlerts(m, prevMetrics.current) : [];
  const uptime = stats ? fmtUptime(Date.now(), stats.l1.firstTs) : '—';
  const cpuHistory  = history.current.map(x => x.cpu);
  const memHistory  = history.current.map(x => x.mem);
  const netHistory  = history.current.map(x => x.netRx + x.netTx);
  const duUsed = m ? m.duTotal - m.duFree : 0;

  return (
    <div className={className} style={{ ...s.root, ...style }}>
      {/* Header */}
      <div style={s.row}>
        <span style={s.badge(connected ? '#22c55e' : '#ef4444')}>
          {connected ? '● live' : '○ off'}
        </span>
        <span style={s.label}>Uptime:</span>
        <span style={s.value}>{uptime}</span>
        <span style={{ flex: 1 }} />
        <button style={s.modeBtn} onClick={() => setMode(mode === 'compact' ? 'expanded' : 'compact')}>
          {mode === 'compact' ? '⊞ expand' : '⊟ compact'}
        </button>
      </div>

      <div style={s.divider} />

      {/* CPU + Mem */}
      <div style={s.row}>
        <MetricBar label="CPU" value={m?.cpu ?? 0} color="#4ade80" />
        <MetricBar label="Mem" value={m?.mem ?? 0} color="#60a5fa" />
      </div>

      {mode === 'expanded' && (
        <>
          <div style={s.divider} />
          <div style={s.sparkRow}>
            <SparkBlock label="CPU" data={cpuHistory} max={10000} color="#4ade80" />
            <SparkBlock label="Mem" data={memHistory} max={10000} color="#60a5fa" />
            <SparkBlock label="Net" data={netHistory} color="#f59e0b" />
          </div>
        </>
      )}

      <div style={s.divider} />

      {/* Load 1/5/15 */}
      <div style={s.row}>
        <span style={s.label}>Load:</span>
        <span style={s.value}>{m ? fmtLoad(m.load1) : '—'}</span>
        <span style={{ ...s.label, fontSize: 10 }}>/</span>
        <span style={{ ...s.value, fontSize: 10 }}>{m ? fmtLoad(m.load5) : '—'}</span>
        <span style={{ ...s.label, fontSize: 10 }}>/</span>
        <span style={{ ...s.value, fontSize: 10 }}>{m ? fmtLoad(m.load15) : '—'}</span>
        <span style={{ flex: 1 }} />
        <span style={s.label}>Proc:</span>
        <span style={s.value}>{m ? `${m.nrRunning}/${m.nrTotal}` : '—'}</span>
      </div>

      <div style={s.divider} />

      {/* Disk */}
      <div style={s.row}>
        <span style={s.label}>Disk:</span>
        {mode === 'expanded' ? (
          <span style={s.diskBar}>
            <span style={{ ...s.diskFill, width: `${(m?.duUsage ?? 0) / 100}%` }} />
          </span>
        ) : (
          <span style={{ ...s.mono, color: '#f59e0b' }}>{bar(m?.duUsage ?? 0)}</span>
        )}
        <span style={s.value}>{m ? fmtPct(m.duUsage) : '—'}</span>
        <span style={{ ...s.label, fontSize: 10 }}>
          {m ? `${fmtBytes(duUsed)} / ${fmtBytes(m.duTotal)}` : '—'}
        </span>
        <span style={{ flex: 1 }} />
        <span style={s.label}>Net:</span>
        <span style={{ ...s.value, color: '#34d399' }}>↑{m ? fmtBytes(m.netTx) : '—'}</span>
        <span style={{ ...s.value, color: '#60a5fa' }}>↓{m ? fmtBytes(m.netRx) : '—'}</span>
      </div>

      {alerts.length > 0 && (
        <>
          <div style={s.divider} />
          <div style={s.row}>
            <span style={s.label}>Alerts:</span>
            {alerts.map(a => (
              <span key={a.id} style={s.alert(a.level)}>{a.label}</span>
            ))}
          </div>
        </>
      )}

      <div style={s.divider} />

      {/* Footer */}
      <div style={s.row}>
        <span style={s.label}>Refresh:</span>
        <select
          style={s.select}
          value={intervalIdx}
          onChange={e => setIntervalIdx(Number(e.target.value))}
        >
          {INTERVAL_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  const s = css;
  return (
    <div style={s.metricBar}>
      <span style={s.label}>{label}:</span>
      <span style={{ ...s.mono, color }}>{bar(value)}</span>
      <span style={{ ...s.value, minWidth: 44 }}>{fmtPct(value)}</span>
    </div>
  );
}

function SparkBlock({ label, data, max, color }: { label: string; data: number[]; max?: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      <span style={{ fontSize: 10, color: '#9ca3af' }}>{label}</span>
      <Sparkline data={data} max={max} color={color} fill={color + '22'} width={100} height={28} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const css = {
  root: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: 12,
    background: '#111827',
    color: '#e5e7eb',
    border: '1px solid #374151',
    borderRadius: 6,
    padding: '6px 10px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  sparkRow: {
    display: 'flex',
    gap: 12,
    padding: '4px 0',
  },
  divider: {
    height: 1,
    background: '#1f2937',
    margin: '2px 0',
  },
  label: { color: '#9ca3af', whiteSpace: 'nowrap' as const },
  value: { color: '#f3f4f6', whiteSpace: 'nowrap' as const },
  mono:  { fontFamily: 'inherit', letterSpacing: 1 },
  metricBar: { display: 'flex', alignItems: 'center', gap: 4 },
  badge: (color: string) => ({
    fontSize: 10,
    color,
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  }),
  alert: (level: 'warn' | 'crit') => ({
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 3,
    background: level === 'crit' ? '#7f1d1d' : '#78350f',
    color: level === 'crit' ? '#fca5a5' : '#fcd34d',
    whiteSpace: 'nowrap' as const,
  }),
  diskBar: {
    display: 'inline-block',
    width: 80,
    height: 8,
    background: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  diskFill: {
    display: 'block',
    height: '100%',
    background: '#f59e0b',
    borderRadius: 4,
    transition: 'width 0.4s ease',
  },
  modeBtn: {
    fontSize: 10,
    padding: '1px 6px',
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: 3,
    color: '#9ca3af',
    cursor: 'pointer',
  },
  select: {
    fontSize: 11,
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: 3,
    color: '#e5e7eb',
    padding: '1px 4px',
    cursor: 'pointer',
  },
} as const;
