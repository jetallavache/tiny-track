/**
 * TimeSeriesChart — SVG line chart for one or more metrics over time.
 *
 * Fetches history on connect and appends live samples. Multiple metrics
 * are rendered as overlaid semi-transparent area paths.
 */
import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useTinyTrack } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme, themeStyles } from '../../theme.js';
import { TtMetrics, TtHistoryResp } from '../../../client.js';
import { RING_L1, RING_L2, RING_L3, historyToMetrics } from '../../../proto.js';
import {
  MetricType,
  AggregationType,
  SizeType,
  SIZE_SCALE,
  extractMetricValue,
  METRIC_LABEL,
  METRIC_COLOR_KEY,
} from '../../utils/metrics.js';
import { formatMetricValue } from '../../utils/format.js';

export interface TimeSeriesChartProps {
  /** Metrics to display as overlaid lines. Default: ['cpu']. */
  metrics?: MetricType[];
  /** Ring buffer level. Default: RING_L1. */
  level?: number;
  /** Maximum samples to keep in the buffer. Default: 60. */
  maxSamples?: number;
  /** Chart height in px. Defaults to size-derived value. */
  height?: number;
  /**
   * Aggregation strategy. When provided the component is controlled —
   * the internal switcher is hidden. Omit to let the user switch via UI.
   */
  aggregation?: AggregationType;
  /** Component size variant. Default: 'm'. */
  size?: SizeType;
  className?: string;
  style?: CSSProperties;
  /** Override theme tokens for this instance only. */
  theme?: Partial<TtTheme>;
}

const LEVEL_LABELS: Record<number, string> = {
  [RING_L1]: 'L1 (1h)',
  [RING_L2]: 'L2 (24h)',
  [RING_L3]: 'L3 (7d)',
};

const AGG_OPTIONS: AggregationType[] = ['avg', 'max', 'min'];

/**
 * SVG area chart with live data appended from the WebSocket stream.
 *
 * @param props.metrics     - One or more metrics to overlay on the same chart.
 * @param props.aggregation - Controlled aggregation. Omit to show the built-in switcher.
 * @param props.level       - Ring buffer level to subscribe to.
 * @param props.maxSamples  - Rolling window size.
 * @param props.size        - 's' | 'm' | 'l'.
 */
export function TimeSeriesChart({
  metrics = ['cpu'],
  level = RING_L1,
  maxSamples = 60,
  height,
  aggregation: aggProp,
  size = 'm',
  className,
  style,
  theme: themeProp,
}: TimeSeriesChartProps) {
  const { theme: base } = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);
  const sc = SIZE_SCALE[size];
  const H = height ?? sc.chartH;

  const [aggState, setAggState] = useState<AggregationType>('avg');
  const agg = aggProp ?? aggState;
  const isControlled = aggProp !== undefined;

  const { client, connected } = useTinyTrack();
  const [data, setData] = useState<TtMetrics[]>([]);

  const addSamples = useCallback(
    (samples: TtMetrics[]) => setData((prev) => [...prev, ...samples].slice(-maxSamples)),
    [maxSamples],
  );

  useEffect(() => {
    if (!connected || !client) return;
    client.subscribe(level, 0);
    client.getHistory(level, maxSamples);
    const onHistory = (r: TtHistoryResp) => {
      if (r.level === level) addSamples(historyToMetrics(r));
    };
    const onMetrics = (m: TtMetrics) => addSamples([m]);
    client.on('history', onHistory);
    client.on('metrics', onMetrics);
    return () => {
      client.off('history', onHistory);
      client.off('metrics', onMetrics);
    };
  }, [connected, client, level, maxSamples, addSamples]);

  const latest = data[data.length - 1];

  return (
    <div className={className} style={{ ...s.root, fontSize: sc.font, gap: sc.gap, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: sc.font + 1, fontWeight: 600, color: t.text }}>
          {metrics.map((m) => METRIC_LABEL[m]).join(' / ')}
        </span>
        <span
          style={{
            fontSize: sc.font - 2,
            padding: '1px 4px',
            background: t.surface,
            borderRadius: t.radius,
            color: t.muted,
          }}
        >
          {LEVEL_LABELS[level]}
        </span>
        <span style={{ flex: 1 }} />
        {/* Aggregation switcher — hidden when controlled externally */}
        {!isControlled && (
          <div style={{ display: 'flex', gap: 2 }}>
            {AGG_OPTIONS.map((a) => (
              <button
                key={a}
                onClick={() => setAggState(a)}
                style={{
                  ...s.btn,
                  fontSize: sc.font - 2,
                  background: agg === a ? t.cpu + '33' : t.btnBg,
                  color: agg === a ? t.cpu : t.btnText,
                  border: `1px solid ${agg === a ? t.cpu : t.border}`,
                }}
              >
                {a}
              </button>
            ))}
          </div>
        )}
        {metrics.map(
          (m) =>
            latest && (
              <span key={m} style={{ color: t[METRIC_COLOR_KEY[m]], fontWeight: 600, fontSize: sc.font }}>
                {formatMetricValue(extractMetricValue(latest, m), m)}
              </span>
            ),
        )}
      </div>

      <svg width="100%" height={H} viewBox={`0 0 400 ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {data.length > 1 ? (
          metrics.map((metric) => {
            const values = data.map((d) => extractMetricValue(d, metric));
            const maxVal = metric === 'cpu' || metric === 'mem' || metric === 'disk' ? 10000 : Math.max(...values, 1);
            return (
              <ChartPath key={metric} values={values} maxVal={maxVal} height={H} color={t[METRIC_COLOR_KEY[metric]]} />
            );
          })
        ) : (
          <text x="200" y={H / 2} textAnchor="middle" fill={t.faint} fontSize="12">
            waiting for data…
          </text>
        )}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: sc.font - 2 }}>
        <span style={{ color: t.muted }}>{data.length} samples</span>
        {latest && <span style={{ color: t.muted }}>{new Date(latest.timestamp).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}

/**
 * SVG area + line path for a single metric series.
 *
 * @param props.values  - Array of raw metric values.
 * @param props.maxVal  - Y-axis maximum for normalisation.
 * @param props.height  - SVG viewport height.
 * @param props.color   - Stroke and fill base color.
 */
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
  const pts = values.map(
    (v, i) => [(i / (n - 1)) * W, PAD + (1 - v / maxVal) * (height - PAD * 2)] as [number, number],
  );
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <>
      <path d={`${line} L${W},${height} L0,${height} Z`} fill={color + '20'} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </>
  );
}
