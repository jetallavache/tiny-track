/**
 * Sparkline — minimal SVG area chart for inline metric history.
 */

export interface SparklineProps {
  /** Raw values (0–10000 for percentages, or bytes/s for network). */
  data: number[];
  /** Maximum value for Y-axis scaling. Defaults to max of data. */
  max?: number;
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
}

/**
 * Renders a small SVG area sparkline.
 * Returns null when fewer than 2 data points are available.
 */
export function Sparkline({
  data,
  max,
  width = 120,
  height = 32,
  color = '#4ade80',
  fill = 'rgba(74,222,128,0.15)',
}: SparklineProps) {
  if (data.length < 2) return null;
  const m = max ?? Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / m) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = pts.join(' ');
  const area = `${pts[0]} ${pts.slice(1).join(' ')} ${width},${height} 0,${height}`;
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <polygon points={area} fill={fill} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
