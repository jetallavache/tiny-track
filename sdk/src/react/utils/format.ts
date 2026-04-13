/**
 * Formatting helpers for metric values displayed in SDK components.
 */
import { MetricType } from './metrics.js';

/**
 * Format a percentage value stored as integer*100.
 * @example fmtPct(2550) → "25.5%"
 */
export function fmtPct(val: number): string {
  return (val / 100).toFixed(1) + '%';
}

/**
 * Format a byte count with automatic unit selection (B / KB / MB / GB).
 * @example fmtBytes(1_500_000) → "1.4MB"
 */
export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
}

/**
 * Split a byte count into numeric value string and unit string.
 * Used for styled rendering where the unit is visually de-emphasised.
 * @example splitBytes(1_500_000) → { value: "1.4", unit: "MB" }
 */
export function splitBytes(bytes: number): { value: string; unit: string } {
  if (bytes < 1024) return { value: String(bytes), unit: 'B' };
  if (bytes < 1024 * 1024) return { value: (bytes / 1024).toFixed(0), unit: 'KB' };
  if (bytes < 1024 * 1024 * 1024) return { value: (bytes / (1024 * 1024)).toFixed(1), unit: 'MB' };
  return { value: (bytes / (1024 * 1024 * 1024)).toFixed(1), unit: 'GB' };
}

/**
 * Format a load average value stored as integer*100.
 * @example fmtLoad(125) → "1.25"
 */
export function fmtLoad(val: number): string {
  return (val / 100).toFixed(2);
}

/**
 * Format an uptime duration from seconds into "Xd HH:MM" or "HH:MM".
 * @param sec - Uptime in seconds.
 */
export function fmtUptimeSec(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Format a metric value using the appropriate formatter for its type.
 *
 * @param val    - Raw integer value.
 * @param metric - Metric type determines the formatter.
 */
export function formatMetricValue(val: number, metric: MetricType): string {
  if (metric === 'cpu' || metric === 'mem' || metric === 'disk') return fmtPct(val);
  if (metric === 'load') return fmtLoad(val);
  return fmtBytes(val) + '/s';
}

/**
 * Build an ASCII progress bar using block characters.
 * @param pct   - Value in the 0–10000 range (percent * 100).
 * @param width - Number of characters in the bar. Default: 8.
 * @example bar(5000) → "▓▓▓▓░░░░"
 */
export function bar(pct: number, width = 8): string {
  const filled = Math.round((pct / 10000) * width);
  return '▓'.repeat(filled) + '░'.repeat(width - filled);
}
