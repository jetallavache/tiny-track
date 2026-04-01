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

/** Detect alerts from latest metrics */
export interface Alert { id: string; label: string; level: 'warn' | 'crit' }

export function detectAlerts(m: TtMetrics): Alert[] {
  const alerts: Alert[] = [];
  if (m.cpu > 8000)  alerts.push({ id: 'cpu-crit',  label: 'CPU >80%',  level: 'crit' });
  else if (m.cpu > 6000) alerts.push({ id: 'cpu-warn', label: 'CPU >60%', level: 'warn' });
  if (m.mem > 9000)  alerts.push({ id: 'mem-crit',  label: 'Mem >90%',  level: 'crit' });
  else if (m.mem > 7500) alerts.push({ id: 'mem-warn', label: 'Mem >75%', level: 'warn' });
  if (m.duUsage > 8000) alerts.push({ id: 'disk-crit', label: 'Disk >80%', level: 'crit' });
  else if (m.duUsage > 6000) alerts.push({ id: 'disk-warn', label: 'Disk >60%', level: 'warn' });
  return alerts;
}
