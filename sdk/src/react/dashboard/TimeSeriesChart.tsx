import { useState, useEffect, CSSProperties } from 'react';
import { useTinyTrack } from '../TinyTrackProvider.js';
import { TtMetrics, TtHistoryResp } from '../../client.js';
import { RING_L1, RING_L2, RING_L3 } from '../../proto.js';
import { fmtPct, fmtBytes, fmtLoad } from './utils.js';

export interface TimeSeriesChartProps {
  metric: 'cpu' | 'mem' | 'load' | 'net' | 'disk';
  level?: number;
  maxSamples?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

const LEVEL_LABELS = { [RING_L1]: 'L1 (1h)', [RING_L2]: 'L2 (24h)', [RING_L3]: 'L3 (7d)' };

export function TimeSeriesChart({
  metric,
  level = RING_L1,
  maxSamples = 60,
  height = 180,
  className,
  style,
}: TimeSeriesChartProps) {
  const { client, connected } = useTinyTrack();
  const [data, setData] = useState<TtMetrics[]>([]);
  const [subscribed, setSubscribed] = useState(false);

  // Subscribe to level on mount
  useEffect(() => {
    if (!connected || !client || subscribed) return;
    client.subscribe(level, 0);
    client.getHistory(level, maxSamples);
    setSubscribed(true);

    const onHistory = (r: TtHistoryResp) => {
      if (r.level === level) {
        setData(prev => [...prev, ...r.samples].slice(-maxSamples));
      }
    };
    const onMetrics = (m: TtMetrics) => {
      setData(prev => [...prev, m].slice(-maxSamples));
    };

    client.on('history', onHistory);
    client.on('metrics', onMetrics);
    return () => {
      client.off('history', onHistory);
      client.off('metrics', onMetrics);
    };
  }, [connected, client, level, maxSamples, subscribed]);

  const values = data.map(m => extractValue(m, metric));
  const max = metric === 'cpu' || metric === 'mem' || metric === 'disk' ? 10000 : Math.max(...values, 1);
  const latest = data[data.length - 1];
  const latestVal = latest ? extractValue(latest, metric) : 0;

  const s = css;
  return (
    <div className={className} style={{ ...s.root, ...style }}>
      <div style={s.header}>
        <span style={s.title}>{metricLabel(metric)}</span>
        <span style={s.badge}>{LEVEL_LABELS[level]}</span>
        <span style={{ flex: 1 }} />
        <span style={s.value}>{formatValue(latestVal, metric)}</span>
      </div>
      <svg width="100%" height={height} style={{ display: 'block' }}>
        {data.length > 1 && <Chart data={values} max={max} height={height} color={metricColor(metric)} />}
      </svg>
      <div style={s.footer}>
        <span style={s.label}>{data.length} samples</span>
        {latest && (
          <span style={s.label}>
            {new Date(latest.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart SVG
// ---------------------------------------------------------------------------

function Chart({ data, max, height, color }: { data: number[]; max: number; height: number; color: string }) {
  if (data.length < 2) return null;
  const w = 100; // percent
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - (v / max) * (height - 10);
    return `${x}%,${y}`;
  });
  const polyline = pts.join(' ');
  const area = `${pts[0]} ${pts.slice(1).join(' ')} 100%,${height} 0%,${height}`;
  return (
    <>
      <polygon points={area} fill={color + '22'} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractValue(m: TtMetrics, metric: string): number {
  switch (metric) {
    case 'cpu':  return m.cpu;
    case 'mem':  return m.mem;
    case 'load': return m.load1;
    case 'net':  return m.netRx + m.netTx;
    case 'disk': return m.duUsage;
    default:     return 0;
  }
}

function formatValue(val: number, metric: string): string {
  if (metric === 'cpu' || metric === 'mem' || metric === 'disk') return fmtPct(val);
  if (metric === 'load') return fmtLoad(val);
  if (metric === 'net')  return fmtBytes(val) + '/s';
  return String(val);
}

function metricLabel(m: string): string {
  return { cpu: 'CPU', mem: 'Memory', load: 'Load (1m)', net: 'Network', disk: 'Disk' }[m] || m;
}

function metricColor(m: string): string {
  return { cpu: '#4ade80', mem: '#60a5fa', load: '#a78bfa', net: '#f59e0b', disk: '#fb923c' }[m] || '#9ca3af';
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
    padding: 10,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
  },
  title: { fontSize: 13, fontWeight: 600, color: '#f3f4f6' },
  badge: { fontSize: 9, padding: '1px 4px', background: '#1f2937', borderRadius: 3, color: '#9ca3af' },
  label: { color: '#6b7280' },
  value: { color: '#f3f4f6', fontWeight: 600 },
} as const;
