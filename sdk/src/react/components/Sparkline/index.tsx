/**
 * Sparkline — minimal SVG area chart for inline metric history.
 */
import { useEffect, useState, CSSProperties } from 'react';
import { useMetrics } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme } from '../../theme.js';
import { MetricType, SizeType, SIZE_SCALE, extractMetricValue, METRIC_COLOR_KEY } from '../../utils/metrics.js';

export interface SparklineProps {
  /** Raw values (0–10000 for percentages, or bytes/s for network). */
  data?: number[];
  /** Metric to pull from TinyTrackProvider when data is not provided. */
  metric?: MetricType;
  /** Maximum samples to keep. Default: 60. */
  maxSamples?: number;
  /** Maximum value for Y-axis scaling. Defaults to max of data. */
  max?: number;
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
  size?: SizeType;
  className?: string;
  style?: CSSProperties;
  theme?: Partial<TtTheme>;
}

/**
 * Renders a small SVG area sparkline.
 * When `metric` is provided, subscribes to TinyTrackProvider for live data.
 * Returns null when fewer than 2 data points are available.
 */
export function Sparkline({
  data: dataProp,
  metric = 'cpu',
  maxSamples = 60,
  max,
  width,
  height,
  color: colorProp,
  fill: fillProp,
  size = 'm',
  className,
  style,
  theme: themeProp,
}: SparklineProps) {
  const { theme: base } = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const sc = SIZE_SCALE[size];
  const W = width ?? 120;
  const H = height ?? sc.chartH / 4;

  const color = colorProp ?? t[METRIC_COLOR_KEY[metric]];
  const fill = fillProp ?? color + '20';

  const { metrics: live } = useMetrics();
  const [buf, setBuf] = useState<number[]>([]);

  useEffect(() => {
    if (dataProp !== undefined || !live) return;
    const v = extractMetricValue(live, metric);
    setBuf((prev) => [...prev, v].slice(-maxSamples));
  }, [live, metric, maxSamples, dataProp]);

  const data = dataProp ?? buf;
  if (data.length < 2)
    return (
      <svg width={W} height={H} className={className} style={style}>
        <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fill={t.faint} fontSize="9" fontFamily={t.font}>
          waiting…
        </text>
      </svg>
    );

  const m = max ?? Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (v / m) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = pts.join(' ');
  const area = `${pts[0]} ${pts.slice(1).join(' ')} ${W},${H} 0,${H}`;

  return (
    <svg width={W} height={H} className={className} style={{ display: 'block', overflow: 'visible', ...style }}>
      <polygon points={area} fill={fill} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
