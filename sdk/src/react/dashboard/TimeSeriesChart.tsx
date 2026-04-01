import { useState, useEffect, useCallback, CSSProperties } from 'react';
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

const LEVEL_LABELS: Record<number, string> = {
  [RING_L1]: 'L1 (1h)',
  [RING_L2]: 'L2 (24h)',
  [RING_L3]: 'L3 (7d)',
};

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

  const addSamples = useCallback((samples: TtMetrics[]) => {
    setData(prev => [...prev, ...samples].slice(-maxSamples));
  }, [maxSamples]);

  useEffect(() => {
    if (!connected || !client) return;

    // Subscribe to this ring level for live pushes
    client.subscribe(level, 0);
    // Request historical data immediately
    client.getHistory(level, maxSamples);

    const onHistory = (r: TtHistoryResp) => {
      if (r.level === level) addSamples(r.samples);
    };
    const onMetrics = (m: TtMetrics) => {
      addSamples([m]);
    };

    client.on('history', onHistory);
    client.on('metrics', onMetrics);
    return () => {
      client.off('history', onHistory);
      client.off('metrics', onMetrics);
    };
  }, [connected, client, level, maxSamples, addSamples]);

  const values = data.map(m => extractValue(m, metric));
  const maxVal = (metric === 'cpu' || metric === 'mem' || metric === 'disk')
    ? 10000
    : Math.max(...values, 1);
  const latest = data[data.length - 1];
  const latestVal = latest ? extractValue(latest, metric) : null;
  const color = metricColor(metric);

  const s = css;
  return (
    <div className={className} style={{ ...s.root, ...style }}>
      <div style={s.header}>
        <span style={s.title}>{metricLabel(metric)}</span>
        <span style={s.badge}>{LEVEL_LABELS[level]}</span>
        <span style={{ flex: 1 }} />
        <span style={{ ...s.value, color }}>
          {latestVal !== null ? formatValue(latestVal, metric) : '—'}
        </span>
      </div>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 400 ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        {values.length > 1 && (
          <ChartPath values={values} maxVal={maxVal} height={height} color={color} />
        )}
        {values.length === 0 && (
          <text x="200" y={height / 2} textAnchor="middle" fill="#4b5563" fontSize="12">
            waiting for data…
          </text>
        )}
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
// SVG chart — uses fixed viewBox so % coords work reliably
// ---------------------------------------------------------------------------

function ChartPath({ values, maxVal, height, color }: {
  values: number[]; maxVal: number; height: number; color: string;
}) {
  const W = 400;
  const PAD = 4;
  const n = values.length;

  const pts = values.map((v, i) => {
    const x = (i / (n - 1)) * W;
    const y = PAD + (1 - v / maxVal) * (height - PAD * 2);
    return [x, y] as [number, number];
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${height} L0,${height} Z`;

  return (
    <>
      <path d={area} fill={color + '20'} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
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
  return ({ cpu: 'CPU', mem: 'Memory', load: 'Load avg', net: 'Network', disk: 'Disk' } as Record<string, string>)[m] || m;
}

function metricColor(m: string): string {
  return ({ cpu: '#4ade80', mem: '#60a5fa', load: '#a78bfa', net: '#f59e0b', disk: '#fb923c' } as Record<string, string>)[m] || '#9ca3af';
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
    gap: 6,
  },
  header: { display: 'flex', alignItems: 'center', gap: 8 },
  footer: { display: 'flex', justifyContent: 'space-between', fontSize: 10 },
  title:  { fontSize: 13, fontWeight: 600, color: '#f3f4f6' },
  badge:  { fontSize: 9, padding: '1px 4px', background: '#1f2937', borderRadius: 3, color: '#9ca3af' },
  label:  { color: '#6b7280' },
  value:  { fontWeight: 600 },
} as const;
