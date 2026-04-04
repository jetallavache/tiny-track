import { useState, useEffect, useRef, useMemo, CSSProperties } from 'react';
import { useMetrics } from '../TinyTrackProvider.js';
import { useTheme, TtTheme, themeStyles } from '../theme.js';
import { TtMetrics } from '../../client.js';
import { RING_L1 } from '../../proto.js';
import { fmtPct, fmtBytes, fmtLoad, bar, detectAlerts } from './utils.js';
import { Sparkline } from './Sparkline.js';

export type DashboardMode = 'compact' | 'expanded';

export interface DashboardProps {
  mode?: DashboardMode;
  historySize?: number;
  className?: string;
  style?: CSSProperties;
  theme?: Partial<TtTheme>;
}

const INTERVALS = [1000, 2000, 5000, 10000, 30000];
const INTERVAL_LABELS = ['1s', '2s', '5s', '10s', '30s'];
const MAX_LOG = 120;

function fmtUptimeSec(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function Dashboard({ mode: modeProp, historySize = 60, className, style, theme: themeProp }: DashboardProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);

  const { client, metrics, stats, connected, sysinfo, streaming, setStreaming } = useMetrics();
  const [mode, setMode] = useState<DashboardMode>(modeProp ?? 'compact');
  const [intervalIdx, setIntervalIdx] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [wsLog, setWsLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const history = useRef<TtMetrics[]>([]);
  const prevMetrics = useRef<TtMetrics | null>(null);

  // Push a line to the WS console
  const pushLog = (dir: string, msg: string) => {
    const ts = new Date().toLocaleTimeString('en', { hour12: false });
    setWsLog((prev) => {
      const next = [...prev, `[${ts}] ${dir} ${msg}`];
      return next.length > MAX_LOG ? next.slice(-MAX_LOG) : next;
    });
  };

  useEffect(() => {
    if (!metrics) return;
    history.current = [...history.current.slice(-(historySize - 1)), metrics];
    prevMetrics.current = metrics;
  }, [metrics, historySize]);

  // Request history on connect
  useEffect(() => {
    if (connected && client) {
      client.getHistory(RING_L1, historySize);
      pushLog('→', `CMD_GET_HISTORY L1 max=${historySize}`);
    }
  }, [connected, client, historySize]);

  // Log all incoming packets
  useEffect(() => {
    if (!client) return;
    const lastTs = { current: 0 };

    const onMetrics = (m: TtMetrics) => {
      if (m.timestamp === lastTs.current) return;
      lastTs.current = m.timestamp;
      pushLog(
        '←',
        `PKT_METRICS cpu=${fmtPct(m.cpu)} mem=${fmtPct(m.mem)} rx=${fmtBytes(m.netRx)}/s tx=${fmtBytes(m.netTx)}/s`,
      );
    };
    const onAck = (a: { cmdType: number; status: number }) => {
      const cmdNames: Record<number, string> = {
        0x01: 'SET_INTERVAL',
        0x02: 'SET_ALERTS',
        0x03: 'GET_SNAPSHOT',
        0x10: 'GET_RING_STATS',
        0x11: 'GET_SYS_INFO',
        0x12: 'START',
        0x13: 'STOP',
      };
      const name = cmdNames[a.cmdType] ?? `0x${a.cmdType.toString(16)}`;
      pushLog('←', `PKT_ACK cmd=${name} status=${a.status === 0 ? 'OK' : 'ERR'}`);
    };
    const onConfig = (c: { intervalMs: number }) => {
      pushLog('←', `PKT_CONFIG interval=${c.intervalMs}ms`);
    };
    const onStats = () => pushLog('←', 'PKT_RING_STATS');
    const onSysInfo = (si: { hostname: string; uptimeSec: number }) => {
      pushLog('←', `PKT_SYS_INFO host=${si.hostname} uptime=${fmtUptimeSec(si.uptimeSec)}`);
    };
    const onOpen = () => {
      pushLog('✓', 'connected');
      pushLog('→', 'CMD_GET_SYS_INFO');
      pushLog('→', 'CMD_GET_SNAPSHOT');
    };
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

  useEffect(() => {
    if (consoleOpen && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [wsLog, consoleOpen]);

  const m = metrics;
  const alerts = useMemo(() => (m ? detectAlerts(m, prevMetrics.current) : []), [m]);
  const cpuHistory = history.current.map((x) => x.cpu);
  const memHistory = history.current.map((x) => x.mem);
  const netHistory = history.current.map((x) => x.netRx + x.netTx);
  const duUsed = m ? m.duTotal - m.duFree : 0;

  // Uptime: prefer sysinfo (system uptime), fallback to ring stats
  const uptimeStr = sysinfo
    ? fmtUptimeSec(sysinfo.uptimeSec)
    : stats
      ? fmtUptimeSec(Math.floor((Date.now() - stats.l1.firstTs) / 1000))
      : '—';

  return (
    <div className={className} style={{ ...s.root, width: '100%', ...style }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={s.badge(connected ? t.ok : t.crit)}>{connected ? '● live' : '○ off'}</span>
        {sysinfo && <span style={{ color: t.muted, fontSize: 11, minWidth: 80 }}>{sysinfo.hostname}</span>}
        <span style={{ color: t.muted, fontSize: 10 }}>up</span>
        <span style={{ ...s.numval, fontSize: 11 }}>{uptimeStr}</span>
        <span style={{ flex: 1 }} />
        {connected && (
          <button
            style={s.btn}
            onClick={() => {
              const next = !streaming;
              setStreaming(next);
              pushLog('→', next ? 'CMD_START' : 'CMD_STOP');
            }}
          >
            {streaming ? '⏸ stop' : '▶ start'}
          </button>
        )}
        <button style={s.btn} onClick={() => setConsoleOpen((o) => !o)}>
          {consoleOpen ? '⊟ log' : '⊞ log'}
        </button>
        <button style={s.btn} onClick={() => setMode(mode === 'compact' ? 'expanded' : 'compact')}>
          {mode === 'compact' ? '⊞' : '⊟'}
        </button>
      </div>

      <div style={s.divider} />

      {/* CPU + Mem */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <MetricBar label="CPU" value={m?.cpu ?? 0} color={t.cpu} t={t} />
        <MetricBar label="Mem" value={m?.mem ?? 0} color={t.mem} t={t} />
      </div>

      {mode === 'expanded' && (
        <>
          <div style={s.divider} />
          <div style={{ display: 'flex', gap: 12, padding: '4px 0' }}>
            <SparkBlock label="CPU" data={cpuHistory} max={10000} color={t.cpu} />
            <SparkBlock label="Mem" data={memHistory} max={10000} color={t.mem} />
            <SparkBlock label="Net" data={netHistory} color={t.net} />
          </div>
        </>
      )}

      <div style={s.divider} />

      {/* Load */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={s.label}>Load</span>
        <span style={{ ...s.numval, color: t.load }}>{m ? fmtLoad(m.load1) : '—'}</span>
        <span style={{ color: t.faint }}>/</span>
        <span style={{ ...s.numval, color: t.muted, fontSize: 11 }}>{m ? fmtLoad(m.load5) : '—'}</span>
        <span style={{ color: t.faint }}>/</span>
        <span style={{ ...s.numval, color: t.muted, fontSize: 11 }}>{m ? fmtLoad(m.load15) : '—'}</span>
        <span style={{ flex: 1 }} />
        <span style={s.label}>Proc</span>
        <span style={{ ...s.numval }}>{m ? `${m.nrRunning}/${m.nrTotal}` : '—'}</span>
      </div>

      <div style={s.divider} />

      {/* Disk */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={s.label}>Disk</span>
        {mode === 'expanded' ? (
          <span
            style={{
              display: 'inline-block',
              width: 80,
              height: 6,
              background: t.surface,
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                background: t.disk,
                borderRadius: 99,
                width: `${(m?.duUsage ?? 0) / 100}%`,
                transition: t.transition ?? 'width 0.4s ease',
              }}
            />
          </span>
        ) : (
          <span style={{ color: t.disk, letterSpacing: 1, minWidth: 72 }}>{bar(m?.duUsage ?? 0)}</span>
        )}
        <span style={{ ...s.numval, color: t.disk }}>{m ? fmtPct(m.duUsage) : '—'}</span>
        <span style={{ color: t.faint, fontSize: 10, minWidth: 120 }}>
          {m ? `${fmtBytes(duUsed)} / ${fmtBytes(m.duTotal)}` : '—'}
        </span>
      </div>

      <div style={s.divider} />

      {/* Net */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={s.label}>Net</span>
        <span style={{ color: t.net, minWidth: 20 }}>↑</span>
        <span style={{ ...s.numval, color: t.net }}>{m ? fmtBytes(m.netTx) + '/s' : '—'}</span>
        <span style={{ color: t.mem, minWidth: 20 }}>↓</span>
        <span style={{ ...s.numval, color: t.mem }}>{m ? fmtBytes(m.netRx) + '/s' : '—'}</span>
      </div>

      {alerts.length > 0 && (
        <>
          <div style={s.divider} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={s.label}>Alerts</span>
            {alerts.map((a) => (
              <span key={a.id} style={s.alert(a.level)}>
                {a.label}
              </span>
            ))}
          </div>
        </>
      )}

      <div style={s.divider} />

      {/* Footer: interval + sysinfo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={s.label}>Refresh</span>
        <select
          style={s.select}
          value={intervalIdx}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setIntervalIdx(idx);
            if (client) {
              const ms = INTERVALS[idx];
              client.setInterval(ms);
              pushLog('→', `CMD_SET_INTERVAL: ${ms}ms`);
            }
          }}
        >
          {INTERVAL_LABELS.map((l, i) => (
            <option key={i} value={i}>
              {l}
            </option>
          ))}
        </select>
        {sysinfo && (
          <>
            <span style={{ color: t.faint, fontSize: 10 }}>│</span>
            <span style={{ color: t.faint, fontSize: 10 }}>{sysinfo.osType}</span>
            <span style={{ color: t.faint, fontSize: 10 }}>│</span>
            <span style={{ color: t.faint, fontSize: 10 }}>
              L1:{sysinfo.slotsL1} L2:{sysinfo.slotsL2} L3:{sysinfo.slotsL3}
            </span>
          </>
        )}
      </div>

      {/* WS Console */}
      {consoleOpen && (
        <>
          <div style={s.divider} />
          <div
            ref={logRef}
            style={{
              fontFamily: '"JetBrains Mono","Fira Code",monospace',
              fontSize: 10,
              background: t.surface,
              border: `1px solid ${t.divider}`,
              borderRadius: t.radius,
              padding: '6px 8px',
              maxHeight: 180,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {wsLog.length === 0 ? (
              <span style={{ color: t.faint }}>No packets yet…</span>
            ) : (
              wsLog.map((line, i) => (
                <div
                  key={i}
                  style={{
                    color: line.includes('→')
                      ? t.muted
                      : line.includes('←')
                        ? t.ok
                        : line.includes('✗')
                          ? t.crit
                          : t.muted,
                  }}
                >
                  {line}
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button style={s.btn} onClick={() => setWsLog([])}>
              clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MetricBar({ label, value, color, t }: { label: string; value: number; color: string; t: TtTheme }) {
  const s = themeStyles(t);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 180 }}>
      <span style={{ ...s.label, minWidth: 28 }}>{label}</span>
      <span style={{ color, letterSpacing: 1, minWidth: 72, fontFamily: '"JetBrains Mono","Fira Code",monospace' }}>
        {bar(value)}
      </span>
      <span style={{ ...s.numval, color, minWidth: 48 }}>{fmtPct(value)}</span>
    </div>
  );
}

function SparkBlock({ label, data, max, color }: { label: string; data: number[]; max?: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      <span style={{ fontSize: 10, color: '#9ca3af' }}>{label}</span>
      <Sparkline data={data} max={max} color={color} fill={color + '22'} width={100} height={28} />
    </div>
  );
}
