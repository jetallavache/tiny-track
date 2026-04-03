import { TtMetrics } from '../../client.js';

export function fmtPct(val: number): string {
  return (val / 100).toFixed(1) + '%';
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
}

export function fmtLoad(val: number): string {
  return (val / 100).toFixed(2);
}

export function fmtUptime(nowMs: number, firstTs: number): string {
  if (!firstTs) return '—';
  const sec = Math.floor((nowMs - firstTs) / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0
    ? `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Build a simple ASCII bar: ▓▓▓░░░ */
export function bar(pct: number, width = 8): string {
  const filled = Math.round((pct / 10000) * width);
  return '▓'.repeat(filled) + '░'.repeat(width - filled);
}

/** Load trend: compare 1m vs 15m to detect rising/falling */
export type LoadTrend = 'rising' | 'falling' | 'stable';

export function loadTrend(m: TtMetrics): LoadTrend {
  const diff = m.load1 - m.load15;
  if (diff > 20) return 'rising'; // >0.2 difference
  if (diff < -20) return 'falling';
  return 'stable';
}

export interface Alert {
  id: string;
  label: string;
  level: 'warn' | 'crit' | 'ok';
}

export function detectAlerts(m: TtMetrics, prev: TtMetrics | null): Alert[] {
  const alerts: Alert[] = [];

  // CPU
  if (m.cpu > 8000) alerts.push({ id: 'cpu-crit', label: 'CPU >80%', level: 'crit' });
  else if (m.cpu > 6000) alerts.push({ id: 'cpu-warn', label: 'CPU >60%', level: 'warn' });

  // Memory
  if (m.mem > 9000) alerts.push({ id: 'mem-crit', label: 'Mem >90%', level: 'crit' });
  else if (m.mem > 7500) alerts.push({ id: 'mem-warn', label: 'Mem >75%', level: 'warn' });

  // Disk
  if (m.duUsage > 8000) alerts.push({ id: 'disk-crit', label: 'Disk >80%', level: 'crit' });
  else if (m.duUsage > 6000) alerts.push({ id: 'disk-warn', label: 'Disk >60%', level: 'warn' });

  // Load trend (1m vs 15m)
  const trend = loadTrend(m);
  if (trend === 'rising') alerts.push({ id: 'load-rise', label: '↑ Load rising', level: 'warn' });
  if (trend === 'falling') alerts.push({ id: 'load-fall', label: '↓ Load falling', level: 'ok' });

  // Sudden load spike vs previous sample
  if (prev && m.load1 - prev.load1 > 50) {
    alerts.push({ id: 'load-spike', label: '⚡ Load spike', level: 'crit' });
  }

  return alerts;
}
