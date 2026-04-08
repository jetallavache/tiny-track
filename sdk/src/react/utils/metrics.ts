/**
 * Metric type definitions and helpers shared across all SDK components.
 */
import { TtMetrics } from '../../client.js';

/** Identifiers for the six available system metrics. */
export type MetricType = 'cpu' | 'mem' | 'net' | 'disk' | 'load' | 'proc';

/** Aggregation strategy matching server-side tt_metrics_aggregate_avg/max/min. */
export type AggregationType = 'avg' | 'max' | 'min';

/** Component size variant. */
export type SizeType = 's' | 'm' | 'l';

/** All metric types in display order. */
export const ALL_METRICS: MetricType[] = ['cpu', 'mem', 'net', 'disk', 'load', 'proc'];

/** Human-readable label for each metric. */
export const METRIC_LABEL: Record<MetricType, string> = {
  cpu: 'CPU', mem: 'Mem', net: 'Net', disk: 'Disk', load: 'Load', proc: 'Proc',
};

/**
 * Maps MetricType to the corresponding TtTheme color token key.
 * Allows `t[METRIC_COLOR_KEY[metric]]` lookups without string casting.
 */
export const METRIC_COLOR_KEY: Record<MetricType, 'cpu' | 'mem' | 'net' | 'disk' | 'load'> = {
  cpu: 'cpu', mem: 'mem', net: 'net', disk: 'disk', load: 'load', proc: 'muted' as any,
};

/**
 * Scale factors for each size variant.
 * Components multiply these values to derive font sizes, gaps, padding and chart heights.
 */
export const SIZE_SCALE: Record<SizeType, { font: number; gap: number; pad: number; chartH: number }> = {
  s: { font: 10, gap: 3, pad: 4,  chartH: 80  },
  m: { font: 12, gap: 4, pad: 6,  chartH: 140 },
  l: { font: 14, gap: 6, pad: 10, chartH: 220 },
};

/**
 * Extract the numeric value for a given metric from a TtMetrics sample.
 *
 * @param m - Metrics sample.
 * @param metric - Which metric to extract.
 * @returns Raw integer value (cpu/mem/disk: 0–10000; load: integer*100; net: bytes/s).
 */
export function extractMetricValue(m: TtMetrics, metric: MetricType): number {
  switch (metric) {
    case 'cpu':  return m.cpu;
    case 'mem':  return m.mem;
    case 'load': return m.load1;
    case 'net':  return m.netRx + m.netTx;
    case 'disk': return m.duUsage;
    case 'proc': return m.nrTotal;
  }
}

/**
 * Aggregate an array of samples for a given metric using avg, max or min.
 * Mirrors the server-side tt_metrics_aggregate_avg/max/min functions.
 *
 * @param samples - Array of metric samples.
 * @param metric  - Which metric field to aggregate.
 * @param type    - Aggregation strategy.
 * @returns Aggregated integer value, or 0 if samples is empty.
 */
export function aggregate(samples: TtMetrics[], metric: MetricType, type: AggregationType): number {
  if (!samples.length) return 0;
  const vals = samples.map((m) => extractMetricValue(m, metric));
  if (type === 'max') return Math.max(...vals);
  if (type === 'min') return Math.min(...vals);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
