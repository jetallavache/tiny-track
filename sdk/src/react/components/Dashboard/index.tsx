/**
 * Dashboard — full-featured metrics panel with compact and expanded modes.
 *
 * Features:
 * - Start / Stop streaming controls
 * - Interval selector (1s – 30s)
 * - Sparklines in expanded mode
 * - Collapsible WebSocket packet console
 * - Alert badge near uptime (5-second auto-dismiss, no layout shift)
 * - Configurable metric subset and size variant
 */
import { useState, useEffect, useRef, useMemo, CSSProperties } from 'react';
import { useMetrics } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme, themeStyles } from '../../theme.js';
import { useAlertBadge } from '../../hooks/useAlertBadge.js';
import { detectAlerts } from '../../utils/alerts.js';
import { fmtPct, fmtBytes, fmtLoad, fmtUptimeSec, bar } from '../../utils/format.js';
import { MetricType, SizeType, SIZE_SCALE, ALL_METRICS } from '../../utils/metrics.js';
import { TtMetrics } from '../../../client.js';
import { RING_L1 } from '../../../proto.js';
import { MetricBarRow, SparkBlock } from './MetricBarRow.js';
import { WsConsole } from './WsConsole.js';

export type DashboardMode = 'compact' | 'expanded';

export interface DashboardProps {
  mode?: DashboardMode;
  historySize?: number;
  className?: string;
  style?: CSSProperties;
  /** Override theme tokens for this instance only. */
  theme?: Partial<TtTheme>;
  /** Metrics to display. Defaults to all five metrics. */
  metrics?: MetricType[];
  /** Component size variant. Default: 'm'. */
  size?: SizeType;
}

const INTERVALS = [1000, 2000, 5000, 10000, 30000];
const INTERVAL_LABELS = ['1s', '2s', '5s', '10s', '30s'];
const MAX_LOG = 120;

/**
 * Full-featured dashboard panel.
 *
 * @param props.mode        - 'compact' (default) or 'expanded' (shows sparklines).
 * @param props.historySize - Number of samples to keep for sparklines. Default: 60.
 * @param props.metrics     - Subset of metrics to display.
 * @param props.size        - 's' | 'm' | 'l' — scales all visual elements.
 */
export function Dashboard({
  mode: modeProp, historySize = 60, className, style, theme: themeProp,
  metrics = ALL_METRICS,
  size = 'm',
}: DashboardProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);
  const sc = SIZE_SCALE[size];
  const show = (metric: MetricType) => metrics.includes(metric);

  const { client, metrics: metrics_data, stats, connected, sysinfo, streaming, setStreaming } = useMetrics();
  const [mode, setMode] = useState<DashboardMode>(modeProp ?? 'compact');
  const [intervalIdx, setIntervalIdx] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [wsLog, setWsLog] = useState<string[]>([]);
  const history = useRef<TtMetrics[]>([]);
  const prevMetrics = useRef<TtMetrics | null>(null);

  const allAlerts = useMemo(
    () => (metrics_data ? detectAlerts(metrics_data, prevMetrics.current) : []),
    [metrics_data],
  );
  const badge = useAlertBadge(allAlerts);

  const pushLog = (dir: string, msg: string) => {
    const ts = new Date().toLocaleTimeString('en', { hour12: false });
    setWsLog((prev) => {
      const next = [...prev, `[${ts}] ${dir} ${msg}`];
      return next.length > MAX_LOG ? next.slice(-MAX_LOG) : next;
    });
  };

  useEffect(() => {
    if (!metrics_data) return;
    history.current = [...history.current.slice(-(historySize - 1)), metrics_data];
    prevMetrics.current = metrics_data;
  }, [metrics_data, historySize]);

  useEffect(() => {
    if (connected && client) {
      client.getHistory(RING_L1, historySize);
      pushLog('→', `CMD_GET_HISTORY L1 max=${historySize}`);
    }
  }, [connected, client, historySize]);

  useEffect(() => {
    if (!client) return;
    const lastTs = { current: 0 };
    const onMetrics = (m: TtMetrics) => {
      if (m.timestamp === lastTs.current) return;
      lastTs.current = m.timestamp;
      pushLog('←', `PKT_METRICS cpu=${fmtPct(m.cpu)} mem=${fmtPct(m.mem)} rx=${fmtBytes(m.netRx)}/s tx=${fmtBytes(m.netTx)}/s`);
    };
    const onAck = (a: { cmdType: number; status: number }) => {
      const names: Record<number, string> = {
        0x01: 'SET_INTERVAL', 0x02: 'SET_ALERTS', 0x03: 'GET_SNAPSHOT',
        0x10: 'GET_RING_STATS', 0x11: 'GET_SYS_INFO', 0x12: 'START', 0x13: 'STOP',
      };
      pushLog('←', `PKT_ACK cmd=${names[a.cmdType] ?? `0x${a.cmdType.toString(16)}`} status=${a.status === 0 ? 'OK' : 'ERR'}`);
    };
    const onConfig  = (c: { intervalMs: number }) => pushLog('←', `PKT_CONFIG interval=${c.intervalMs}ms`);
    const onStats   = () => pushLog('←', 'PKT_RING_STATS');
    const onSysInfo = (si: { hostname: string; uptimeSec: number }) =>
      pushLog('←', `PKT_SYS_INFO host=${si.hostname} uptime=${fmtUptimeSec(si.uptimeSec)}`);
    const onOpen  = () => { pushLog('✓', 'connected'); pushLog('→', 'CMD_GET_SYS_INFO'); pushLog('→', 'CMD_GET_SNAPSHOT'); };
    const onClose = (code: number) => pushLog('✗', `closed (${code})`);

    client.on('metrics', onMetrics);
    client.on('ack', onAck);
    client.on('config', onConfig);
    client.on('stats', onStats);
    client.on('sysinfo', onSysInfo);
    client.on('open', onOpen);
    client.on('close', onClose);
    return () => {
      client.off('metrics', onMetrics);
      client.off('ack', onAck);
      client.off('config', onConfig);
      client.off('stats', onStats);
      client.off('sysinfo', onSysInfo);
      client.off('open', onOpen);
      client.off('close', onClose);
    };
  }, [client]);

  const m = metrics_data;
  const cpuHistory = history.current.map((x) => x.cpu);
  const memHistory = history.current.map((x) => x.mem);
  const netHistory = history.current.map((x) => x.netRx + x.netTx);
  const duUsed = m ? m.duTotal - m.duFree : 0;

  const uptimeStr = sysinfo
    ? fmtUptimeSec(sysinfo.uptimeSec)
    : stats ? fmtUptimeSec(Math.floor((Date.now() - stats.l1.firstTs) / 1000)) : '—';

  return (
    <div className={className} style={{ ...s.root, fontSize: sc.font, gap: sc.gap, width: '100%', ...style }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={s.badge(connected ? t.ok : t.crit)}>{connected ? '● live' : '○ off'}</span>
        {sysinfo && <span style={{ color: t.muted, fontSize: sc.font - 1, minWidth: 80 }}>{sysinfo.hostname}</span>}
        <span style={{ color: t.muted, fontSize: sc.font - 2 }}>up</span>
        <span style={{ ...s.numval, fontSize: sc.font - 1 }}>{uptimeStr}</span>
        {/* Fixed-width alert badge slot */}
        <span style={{ minWidth: 88, height: sc.font + 4 }}>
          {badge && <span style={s.alert(badge.level)}>{badge.label}</span>}
        </span>
        <span style={{ flex: 1 }} />
        {connected && (
          <button style={s.btn} onClick={() => { const next = !streaming; setStreaming(next); pushLog('→', next ? 'CMD_START' : 'CMD_STOP'); }}>
            {streaming ? '⏸ stop' : '▶ start'}
          </button>
        )}
        <button style={s.btn} onClick={() => setConsoleOpen((o) => !o)}>{consoleOpen ? '⊟ log' : '⊞ log'}</button>
        <button style={s.btn} onClick={() => setMode(mode === 'compact' ? 'expanded' : 'compact')}>{mode === 'compact' ? '⊞' : '⊟'}</button>
      </div>

      <div style={s.divider} />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {show('cpu') && <MetricBarRow label="CPU" value={m?.cpu ?? 0} color={t.cpu} t={t} fontSize={sc.font} />}
        {show('mem') && <MetricBarRow label="Mem" value={m?.mem ?? 0} color={t.mem} t={t} fontSize={sc.font} />}
      </div>

      {mode === 'expanded' && (
        <>
          <div style={s.divider} />
          <div style={{ display: 'flex', gap: 12, padding: '4px 0' }}>
            {show('cpu') && <SparkBlock label="CPU" data={cpuHistory} max={10000} color={t.cpu} h={sc.chartH / 3} />}
            {show('mem') && <SparkBlock label="Mem" data={memHistory} max={10000} color={t.mem} h={sc.chartH / 3} />}
            {show('net') && <SparkBlock label="Net" data={netHistory} color={t.net} h={sc.chartH / 3} />}
          </div>
        </>
      )}

      {show('load') && (
        <>
          <div style={s.divider} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={s.label}>Load</span>
            <span style={{ ...s.numval, color: t.load }}>{m ? fmtLoad(m.load1) : '—'}</span>
            <span style={{ color: t.faint }}>/</span>
            <span style={{ ...s.numval, color: t.muted, fontSize: sc.font - 1 }}>{m ? fmtLoad(m.load5) : '—'}</span>
            <span style={{ color: t.faint }}>/</span>
            <span style={{ ...s.numval, color: t.muted, fontSize: sc.font - 1 }}>{m ? fmtLoad(m.load15) : '—'}</span>
          </div>
        </>
      )}

      {show('proc') && (
        <>
          <div style={s.divider} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={s.label}>Proc</span>
            <span style={s.numval}>{m ? `${m.nrRunning}/${m.nrTotal}` : '—'}</span>
          </div>
        </>
      )}

      {show('disk') && (
        <>
          <div style={s.divider} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={s.label}>Disk</span>
            {mode === 'expanded' ? (
              <span style={{ display: 'inline-block', width: 80, height: 6, background: t.surface, borderRadius: 99, overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', background: t.disk, borderRadius: 99, width: `${(m?.duUsage ?? 0) / 100}%`, transition: t.transition ?? 'width 0.4s ease' }} />
              </span>
            ) : (
              <span style={{ color: t.disk, letterSpacing: 1, minWidth: 72 }}>{bar(m?.duUsage ?? 0)}</span>
            )}
            <span style={{ ...s.numval, color: t.disk }}>{m ? fmtPct(m.duUsage) : '—'}</span>
            <span style={{ color: t.faint, fontSize: sc.font - 2, minWidth: 120 }}>
              {m ? `${fmtBytes(duUsed)} / ${fmtBytes(m.duTotal)}` : '—'}
            </span>
          </div>
        </>
      )}

      {show('net') && (
        <>
          <div style={s.divider} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={s.label}>Net</span>
            <span style={{ color: t.net, minWidth: 20 }}>↑</span>
            <span style={{ ...s.numval, color: t.net }}>{m ? fmtBytes(m.netTx) + '/s' : '—'}</span>
            <span style={{ color: t.mem, minWidth: 20 }}>↓</span>
            <span style={{ ...s.numval, color: t.mem }}>{m ? fmtBytes(m.netRx) + '/s' : '—'}</span>
          </div>
        </>
      )}

      <div style={s.divider} />

      {/* Footer: interval selector + sysinfo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={s.label}>Refresh</span>
        <select
          style={s.select}
          value={intervalIdx}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setIntervalIdx(idx);
            if (client) { client.setInterval(INTERVALS[idx]); pushLog('→', `CMD_SET_INTERVAL: ${INTERVALS[idx]}ms`); }
          }}
        >
          {INTERVAL_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
        </select>
        {sysinfo && (
          <>
            <span style={{ color: t.faint, fontSize: sc.font - 2 }}>│</span>
            <span style={{ color: t.faint, fontSize: sc.font - 2 }}>{sysinfo.osType}</span>
            <span style={{ color: t.faint, fontSize: sc.font - 2 }}>│</span>
            <span style={{ color: t.faint, fontSize: sc.font - 2 }}>L1:{sysinfo.slotsL1} L2:{sysinfo.slotsL2} L3:{sysinfo.slotsL3}</span>
          </>
        )}
      </div>

      {consoleOpen && (
        <>
          <div style={s.divider} />
          <WsConsole log={wsLog} onClear={() => setWsLog([])} t={t} />
        </>
      )}
    </div>
  );
}
