/**
 * TimelineRow — a single ring-level row in the Timeline component.
 *
 * Renders a fixed-width bar chart window. The user scrolls through history
 * with the mouse wheel; the container never grows horizontally.
 */
import { useState, useCallback, useMemo, useRef } from 'react';
import { TtMetrics } from '../../../client.js';
import { TtTheme } from '../../theme.js';
import {
  MetricType, AggregationType,
  extractMetricValue, METRIC_COLOR_KEY, METRIC_LABEL,
} from '../../utils/metrics.js';
import { formatMetricValue } from '../../utils/format.js';

export const BAR_W = 4;
export const VISIBLE_BARS = 200;

export interface TimelineRowProps {
  label: string;
  data: TtMetrics[];
  metrics: MetricType[];
  aggregation: AggregationType;
  rowHeight: number;
  fmtTick: (ts: number) => string;
  /** Number of bars in the visible window. Default: VISIBLE_BARS. */
  visibleBars?: number;
  t: TtTheme;
  sc: { font: number };
}

/**
 * Fixed-width scrollable bar chart for one ring level.
 *
 * @param props.data       - All accumulated samples for this ring level.
 * @param props.metrics    - Which metrics to render as overlaid bars.
 * @param props.aggregation - Currently unused in rendering but shown in tooltip.
 * @param props.rowHeight  - SVG height in pixels.
 * @param props.fmtTick    - Timestamp formatter for the X-axis labels.
 */
export function TimelineRow({ label, data, metrics, aggregation: _agg, rowHeight, fmtTick, visibleBars = VISIBLE_BARS, t, sc }: TimelineRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; text: string } | null>(null);

  const H = rowHeight;
  const W = visibleBars * BAR_W;
  const isFollowing = offset === 0;

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    setOffset((prev) => Math.max(0, Math.min(prev + delta * 5, Math.max(0, data.length - visibleBars))));
  }, [data.length, visibleBars]);

  const visibleData = useMemo(() => {
    const end = data.length - offset;
    return data.slice(Math.max(0, end - visibleBars), end);
  }, [data, offset, visibleBars]);

  const maxVals = useMemo(() =>
    metrics.reduce((acc, m) => {
      acc[m] = m === 'cpu' || m === 'mem' || m === 'disk'
        ? 10000
        : Math.max(...visibleData.map((d) => extractMetricValue(d, m)), 1);
      return acc;
    }, {} as Record<MetricType, number>),
    [metrics, visibleData],
  );

  const latest = visibleData[visibleData.length - 1];

  const tickInterval = Math.max(1, Math.floor(80 / BAR_W));
  const ticks = useMemo(() =>
    visibleData
      .map((m, i) => (i % tickInterval === 0 ? { x: i * BAR_W, label: fmtTick(m.timestamp) } : null))
      .filter(Boolean) as { x: number; label: string }[],
    [visibleData, tickInterval, fmtTick],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.floor(x / BAR_W);
    if (idx >= 0 && idx < visibleData.length) {
      const d = visibleData[idx];
      const vals = metrics
        .map((m) => `${METRIC_LABEL[m]}:${formatMetricValue(extractMetricValue(d, m), m)}`)
        .join('  ');
      setTooltip({ x, text: `${fmtTick(d.timestamp)}  ${vals}` });
    }
  }, [visibleData, metrics, fmtTick]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: t.muted, fontSize: sc.font - 2, minWidth: 72 }}>{label}</span>
        {metrics.map((m) => latest && (
          <span key={m} style={{ color: t[METRIC_COLOR_KEY[m]], fontSize: sc.font - 1, fontWeight: 600 }}>
            {formatMetricValue(extractMetricValue(latest, m), m)}
          </span>
        ))}
        <span style={{ color: t.faint, fontSize: sc.font - 3, marginLeft: 'auto' }}>
          {data.length}pts {!isFollowing && `(−${offset})`}
        </span>
      </div>

      <div
        ref={containerRef}
        style={{
          background: t.surface, borderRadius: t.radius, border: `1px solid ${t.divider}`,
          height: H + 16, width: W, maxWidth: '100%',
          position: 'relative', overflow: 'hidden', cursor: 'crosshair',
        }}
        onWheel={onWheel}
      >
        <svg width={W} height={H} style={{ display: 'block' }} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
          {metrics.map((metric, mi) => {
            const color = t[METRIC_COLOR_KEY[metric]];
            const maxV = maxVals[metric];
            return visibleData.map((d, i) => {
              const v = extractMetricValue(d, metric);
              const barH = Math.max(1, (v / maxV) * H);
              const xOff = metrics.length > 1 ? mi * (BAR_W / metrics.length) : 0;
              const bw = metrics.length > 1 ? BAR_W / metrics.length - 0.5 : BAR_W - 1;
              return (
                <rect key={`${metric}-${i}`} x={i * BAR_W + xOff} y={H - barH} width={bw} height={barH}
                  fill={color} opacity={0.25 + (v / maxV) * 0.65} />
              );
            });
          })}
          {tooltip && <line x1={tooltip.x} y1={0} x2={tooltip.x} y2={H} stroke={t.text} strokeWidth={1} opacity={0.3} />}
        </svg>

        <div style={{ position: 'relative', height: 16, overflow: 'hidden' }}>
          {ticks.map((tk, i) => (
            <span key={i} style={{ position: 'absolute', top: 0, fontSize: 9, color: t.faint, whiteSpace: 'nowrap', transform: 'translateX(-50%)', left: tk.x }}>
              {tk.label}
            </span>
          ))}
        </div>

        {tooltip && (
          <div style={{
            position: 'absolute', top: 2, left: Math.min(tooltip.x + 6, W - 160),
            fontSize: sc.font - 2, background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: t.radius, padding: '2px 6px', color: t.text, whiteSpace: 'nowrap',
            pointerEvents: 'none', zIndex: 10,
          }}>
            {tooltip.text}
          </div>
        )}

        {!isFollowing && (
          <div
            style={{ position: 'absolute', bottom: 18, right: 4, fontSize: 9, color: t.warn, background: t.surface + 'cc', padding: '1px 4px', borderRadius: t.radius, cursor: 'pointer' }}
            onClick={() => setOffset(0)}
          >
            ▶ live
          </div>
        )}
      </div>
    </div>
  );
}
