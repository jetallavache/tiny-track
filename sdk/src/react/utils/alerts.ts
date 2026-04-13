/**
 * Alert detection logic for SDK components.
 * Thresholds are intentionally conservative to avoid alert fatigue.
 */
import { TtMetrics } from '../../client.js';
import type { AlertState } from '../components/MetricsBar/MetricItem.js';

/** A single alert produced by detectAlerts(). */
export interface Alert {
  id: string;
  label: string;
  level: 'warn' | 'crit' | 'ok';
}

/** Load trend direction derived from comparing 1m vs 15m averages. */
export type LoadTrend = 'rising' | 'falling' | 'stable';

/** Network activity level derived from TX+RX throughput. */
export type NetLevel = 'idle' | 'normal' | 'high' | 'saturated';

/**
 * Compute a normalised load score (0–100) from raw load average values.
 *
 * Values are stored as integer*100 (e.g. load=1.25 → 125).
 * Formula: weighted blend l1*0.5 + l5*0.3 + l15*0.2, capped at load=4.0.
 * load=4.0 → score 100 (reasonable ceiling for most systems).
 * Matches MetricsPanel.calcLoadScore exactly.
 */
export function calcLoadScore(load1: number, load5: number, load15: number): number {
  const l1 = load1 / 100,
    l5 = load5 / 100,
    l15 = load15 / 100;
  const raw = l1 * 0.5 + l5 * 0.3 + l15 * 0.2;
  return Math.min(100, Math.round((raw / 4) * 100));
}

/**
 * Determine load trend by comparing 1-minute and 15-minute load averages.
 */
export function loadTrend(m: TtMetrics): LoadTrend {
  const diff = m.load1 - m.load15;
  if (diff > 20) return 'rising';
  if (diff < -20) return 'falling';
  return 'stable';
}

/**
 * Analyse network throughput.
 * Thresholds: high >50 MB/s total, saturated >200 MB/s total.
 */
export function netAnalysis(m: TtMetrics): { level: NetLevel; totalBps: number } {
  const totalBps = m.netTx + m.netRx;
  const level: NetLevel =
    totalBps > 200_000_000 ? 'saturated' : totalBps > 50_000_000 ? 'high' : totalBps > 0 ? 'normal' : 'idle';
  return { level, totalBps };
}

/**
 * Detect threshold violations and load trends in a metrics sample.
 */
export function detectAlerts(m: TtMetrics, prev: TtMetrics | null): Alert[] {
  const alerts: Alert[] = [];

  if (m.cpu > 8000) alerts.push({ id: 'cpu-crit', label: 'CPU >80%', level: 'crit' });
  else if (m.cpu > 6000) alerts.push({ id: 'cpu-warn', label: 'CPU >60%', level: 'warn' });

  if (m.mem > 9000) alerts.push({ id: 'mem-crit', label: 'Mem >90%', level: 'crit' });
  else if (m.mem > 7500) alerts.push({ id: 'mem-warn', label: 'Mem >75%', level: 'warn' });

  if (m.duUsage > 8000) alerts.push({ id: 'disk-crit', label: 'Disk >80%', level: 'crit' });
  else if (m.duUsage > 6000) alerts.push({ id: 'disk-warn', label: 'Disk >60%', level: 'warn' });

  const trend = loadTrend(m);
  if (trend === 'rising') alerts.push({ id: 'load-rise', label: '↑ Load rising', level: 'warn' });
  if (trend === 'falling') alerts.push({ id: 'load-fall', label: '↓ Load falling', level: 'ok' });

  if (prev && m.load1 - prev.load1 > 50) {
    alerts.push({ id: 'load-spike', label: '⚡ Load spike', level: 'crit' });
  }

  const net = netAnalysis(m);
  if (net.level === 'saturated') alerts.push({ id: 'net-saturated', label: 'Net saturated', level: 'crit' });
  else if (net.level === 'high') alerts.push({ id: 'net-high', label: 'Net high load', level: 'warn' });

  return alerts;
}

/**
 * Build a fixed-shape AlertState for the MetricsBar lamp indicators.
 */
export function buildAlertState(m: TtMetrics | null, prev: TtMetrics | null): AlertState {
  if (!m) return { cpu: 'off', mem: 'off', disk: 'off', net: 'off', sys: 'off' };

  const cpu: AlertState['cpu'] = m.cpu > 8000 ? 'crit' : m.cpu > 6000 ? 'warn' : 'ok';

  const mem: AlertState['mem'] = m.mem > 9000 ? 'crit' : m.mem > 7500 ? 'warn' : 'ok';

  const disk: AlertState['disk'] = m.duUsage > 8000 ? 'crit' : m.duUsage > 6000 ? 'warn' : 'ok';

  const { level: netLevel } = netAnalysis(m);
  const net: AlertState['net'] = netLevel === 'saturated' ? 'crit' : netLevel === 'high' ? 'warn' : 'ok';

  const sys: AlertState['sys'] =
    prev && m.load1 - prev.load1 > 50
      ? 'spike'
      : loadTrend(m) === 'rising'
        ? 'rising'
        : loadTrend(m) === 'falling'
          ? 'falling'
          : 'ok';

  return { cpu, mem, disk, net, sys };
}
