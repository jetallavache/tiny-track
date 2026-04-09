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

/**
 * Determine load trend by comparing 1-minute and 15-minute load averages.
 *
 * @param m - Current metrics sample.
 * @returns 'rising' if load1 exceeds load15 by >0.2, 'falling' if below by >0.2, else 'stable'.
 */
export function loadTrend(m: TtMetrics): LoadTrend {
  const diff = m.load1 - m.load15;
  if (diff > 20) return 'rising';
  if (diff < -20) return 'falling';
  return 'stable';
}

/**
 * Detect threshold violations and load trends in a metrics sample.
 *
 * @param m    - Current metrics sample.
 * @param prev - Previous sample used to detect sudden spikes. Pass null on first call.
 * @returns Array of active alerts, empty if everything is within thresholds.
 */
export function detectAlerts(m: TtMetrics, prev: TtMetrics | null): Alert[] {
  const alerts: Alert[] = [];

  if (m.cpu > 8000)      alerts.push({ id: 'cpu-crit',  label: 'CPU >80%',  level: 'crit' });
  else if (m.cpu > 6000) alerts.push({ id: 'cpu-warn',  label: 'CPU >60%',  level: 'warn' });

  if (m.mem > 9000)      alerts.push({ id: 'mem-crit',  label: 'Mem >90%',  level: 'crit' });
  else if (m.mem > 7500) alerts.push({ id: 'mem-warn',  label: 'Mem >75%',  level: 'warn' });

  if (m.duUsage > 8000)      alerts.push({ id: 'disk-crit', label: 'Disk >80%', level: 'crit' });
  else if (m.duUsage > 6000) alerts.push({ id: 'disk-warn', label: 'Disk >60%', level: 'warn' });

  const trend = loadTrend(m);
  if (trend === 'rising')  alerts.push({ id: 'load-rise',  label: '↑ Load rising',  level: 'warn' });
  if (trend === 'falling') alerts.push({ id: 'load-fall',  label: '↓ Load falling', level: 'ok'   });

  if (prev && m.load1 - prev.load1 > 50) {
    alerts.push({ id: 'load-spike', label: '⚡ Load spike', level: 'crit' });
  }

  return alerts;
}

/**
 * Build a fixed-shape AlertState for the MetricsBar lamp indicators.
 * Every key is always present — no layout shift when alerts change.
 *
 * @param m    - Current metrics sample.
 * @param prev - Previous sample for spike detection.
 * @returns AlertState with a severity level for each indicator.
 */
export function buildAlertState(m: TtMetrics | null, prev: TtMetrics | null): AlertState {
  if (!m) return { cpu: 'off', mem: 'off', disk: 'off', load: 'off', spike: 'off' };

  const cpu: AlertState['cpu'] =
    m.cpu > 8000 ? 'crit' : m.cpu > 6000 ? 'warn' : 'ok';

  const mem: AlertState['mem'] =
    m.mem > 9000 ? 'crit' : m.mem > 7500 ? 'warn' : 'ok';

  const disk: AlertState['disk'] =
    m.duUsage > 8000 ? 'crit' : m.duUsage > 6000 ? 'warn' : 'ok';

  const trend = loadTrend(m);
  const load: AlertState['load'] =
    trend === 'rising' ? 'warn' : trend === 'falling' ? 'ok' : 'ok';

  const spike: AlertState['spike'] =
    prev && m.load1 - prev.load1 > 50 ? 'crit' : 'ok';

  return { cpu, mem, disk, load, spike };
}
