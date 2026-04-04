import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useTinyTrack } from '../TinyTrackProvider.js';
import { useTheme, TtTheme, themeStyles } from '../theme.js';
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
  theme?: Partial<TtTheme>;
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
  theme: themeProp,
}: TimeSeriesChartProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);

  const { client, connected } = useTinyTrack();
  const [data, setData] = useState<TtMetrics[]>([]);

  const addSamples = useCallback(
    (samples: TtMetrics[]) => {
      setData((prev) => [...prev, ...samples].slice(-maxSamples));
    },
    [maxSamples],
  );

  useEffect(() => {
    if (!connected || !client) return;
    client.subscribe(level, 0);
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

  const color = metricColor(metric, t);
  const values = data.map((m) => extractValue(m, metric));
  const maxVal = metric === 'cpu' || metric === 'mem' || metric === 'disk' ? 10000 : Math.max(...values, 1);
  const latest = data[data.length - 1];
  const latestVal = latest ? extractValue(latest, metric) : null;

  return (
    <div className={className} style={{ ...s.root, gap: 6, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{metricLabel(metric)}</span>
        <span
          style={{ fontSize: 9, padding: '1px 4px', background: t.surface, borderRadius: t.radius, color: t.muted }}
        >
          {LEVEL_LABELS[level]}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ ...s.value, color, fontWeight: 600 }}>
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
        {values.length > 1 && <ChartPath values={values} maxVal={maxVal} height={height} color={color} />}
        {values.length === 0 && (
          <text x="200" y={height / 2} textAnchor="middle" fill={t.faint} fontSize="12">
            waiting for data…
          </text>
        )}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span style={{ color: t.muted }}>{data.length} samples</span>
        {latest && <span style={{ color: t.muted }}>{new Date(latest.timestamp).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}

function ChartPath({
  values,
  maxVal,
  height,
  color,
}: {
  values: number[];
  maxVal: number;
  height: number;
  color: string;
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
  return (
    <>
      <path d={`${line} L${W},${height} L0,${height} Z`} fill={color + '20'} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </>
  );
}

function extractValue(m: TtMetrics, metric: string): number {
  switch (metric) {
    case 'cpu':
      return m.cpu;
    case 'mem':
      return m.mem;
    case 'load':
      return m.load1;
    case 'net':
      return m.netRx + m.netTx;
    case 'disk':
      return m.duUsage;
    default:
      return 0;
  }
}

function formatValue(val: number, metric: string): string {
  if (metric === 'cpu' || metric === 'mem' || metric === 'disk') return fmtPct(val);
  if (metric === 'load') return fmtLoad(val);
  if (metric === 'net') return fmtBytes(val) + '/s';
  return String(val);
}

function metricLabel(m: string): string {
  return (
    ({ cpu: 'CPU', mem: 'Memory', load: 'Load avg', net: 'Network', disk: 'Disk' } as Record<string, string>)[m] || m
  );
}

function metricColor(m: string, t: TtTheme): string {
  return ({ cpu: t.cpu, mem: t.mem, load: t.load, net: t.net, disk: t.disk } as Record<string, string>)[m] || t.muted;
}
