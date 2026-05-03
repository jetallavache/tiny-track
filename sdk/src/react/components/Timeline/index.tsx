/**
 * Timeline — scrollable bar chart across all three ring levels (L1/L2/L3).
 *
 * Each row shows a fixed-width window of samples. Scroll with the mouse wheel
 * to navigate history. Multiple metrics can be overlaid on the same row.
 * Includes built-in aggregation switcher and visible-window size selector.
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
  METRIC_LABEL,
  METRIC_COLOR_KEY,
} from '../../utils/metrics.js';
import { TimelineRow } from './TimelineRow.js';

export interface TimelineProps {
  /** Metrics to visualise. Default: ['cpu']. */
  metrics?: MetricType[];
  /** Height of each ring row in px. Defaults to size-derived value. */
  rowHeight?: number;
  /**
   * Aggregation function. When provided the component is controlled —
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

const RINGS = [
  { level: RING_L1, label: 'L1 · 1s', fmt: fmtTime },
  { level: RING_L2, label: 'L2 · 1m', fmt: fmtHour },
  { level: RING_L3, label: 'L3 · 1h', fmt: fmtDay },
] as const;

const AGG_OPTIONS: AggregationType[] = ['avg', 'max', 'min'];

/** Visible-window presets: number of bars shown at once. */
const WINDOW_OPTIONS = [60, 120, 200, 300, 500] as const;

/**
 * Three-row timeline spanning L1 (1s), L2 (1m) and L3 (1h) ring buffers.
 *
 * @param props.metrics     - Metrics to overlay on each row.
 * @param props.aggregation - Controlled aggregation. Omit to show the built-in switcher.
 * @param props.rowHeight   - Override the per-row SVG height.
 * @param props.size        - 's' | 'm' | 'l'.
 */
export function Timeline({
  metrics = ['cpu'],
  rowHeight,
  aggregation: aggProp,
  size = 'm',
  className,
  style,
  theme: themeProp,
}: TimelineProps) {
  const { theme: base } = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);
  const sc = SIZE_SCALE[size];
  const rh = rowHeight ?? sc.chartH / 2;

  /* Internal state — only used when aggregation prop is not provided */
  const [aggState, setAggState] = useState<AggregationType>('avg');
  const agg = aggProp ?? aggState;
  const isControlled = aggProp !== undefined;

  const [windowSize, setWindowSize] = useState<number>(200);

  const { client, connected } = useTinyTrack();
  const [samples, setSamples] = useState<Record<number, TtMetrics[]>>({
    [RING_L1]: [],
    [RING_L2]: [],
    [RING_L3]: [],
  });

  const addSamples = useCallback((level: number, incoming: TtMetrics[]) => {
    setSamples((prev) => {
      const merged = [...prev[level], ...incoming];
      const map = new Map(merged.map((m) => [m.timestamp, m]));
      return { ...prev, [level]: [...map.values()].sort((a, b) => a.timestamp - b.timestamp) };
    });
  }, []);

  useEffect(() => {
    if (!connected || !client) return;
    client.getHistory(RING_L1, 3600);
    client.getHistory(RING_L2, 1440);
    client.getHistory(RING_L3, 168);
    const onHistory = (r: TtHistoryResp) => addSamples(r.level, historyToMetrics(r));
    const onMetrics = (m: TtMetrics) => addSamples(RING_L1, [m]);
    client.on('history', onHistory);
    client.on('metrics', onMetrics);
    return () => {
      client.off('history', onHistory);
      client.off('metrics', onMetrics);
    };
  }, [connected, client, addSamples]);

  return (
    <div className={className} style={{ ...s.root, fontSize: sc.font, gap: sc.gap, ...style }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: sc.font + 1, fontWeight: 600, color: t.text }}>Timeline</span>

        {/* Metric badges */}
        {metrics.map((m) => (
          <span
            key={m}
            style={{
              fontSize: sc.font - 2,
              padding: '1px 5px',
              background: t.surface,
              borderRadius: t.radius,
              color: t[METRIC_COLOR_KEY[m]],
            }}
          >
            {METRIC_LABEL[m]}
          </span>
        ))}

        <span style={{ flex: 1 }} />

        {/* Window size selector */}
        <select
          value={windowSize}
          onChange={(e) => setWindowSize(Number(e.target.value))}
          style={{ ...s.select, fontSize: sc.font - 2 }}
          title="Visible window (bars)"
        >
          {WINDOW_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} bars
            </option>
          ))}
        </select>

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
      </div>

      <div style={s.divider} />

      {RINGS.map((ring) => (
        <TimelineRow
          key={ring.level}
          label={ring.label}
          data={samples[ring.level]}
          metrics={metrics}
          aggregation={agg}
          rowHeight={rh}
          fmtTick={ring.fmt}
          visibleBars={windowSize}
          t={t}
          sc={sc}
        />
      ))}
    </div>
  );
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fmtHour(ts: number): string {
  return new Date(ts).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function fmtDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}h`;
}
