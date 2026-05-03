/**
 * Dashboard v2 — admin dashboard with SVG gauges, sparklines, ring buffer status.
 *
 * Layout:
 *  Header:   TtLogo + LIVE pulse + hostname/OS/uptime (optional) + alert badge + controls
 *  SysInfo:  hostname · OS · uptime · kernel (collapsible via showSysInfo prop)
 *  Gauges:   CPU · MEM · DISK · LOAD · NET (5 speedometers)
 *  Expanded: sparkline row under gauges (click gauge or press 1–5 to focus)
 *  Buffers:  L1/L2/L3 fill progress bars
 *  Footer:   interval selector
 *  Console:  collapsible WS packet log
 */
import { useState, useEffect, useRef, useMemo, CSSProperties } from 'react';
import { useMetrics } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme, themeStyles } from '../../theme.js';
import { useAlertBadge } from '../../hooks/useAlertBadge.js';
import { detectAlerts } from '../../utils/alerts.js';
import { fmtPct, fmtBytes, fmtLoad, fmtUptimeSec } from '../../utils/format.js';
import { MetricType, SizeType, SIZE_SCALE } from '../../utils/metrics.js';
import { TtMetrics } from '../../../client.js';
import { RING_L1 } from '../../../proto.js';
import { SparkBlock } from './MetricBarRow.js';
import { WsConsole } from './WsConsole.js';
import { Gauge } from './Gauge.js';

export type DashboardMode = 'compact' | 'expanded';

export interface DashboardProps {
  /** 'compact' = gauges only; 'expanded' = gauges + sparklines. Default: 'compact'. */
  mode?: DashboardMode;
  historySize?: number;
  /** Show system info row (hostname, OS, uptime). Default: true. */
  showSysInfo?: boolean;
  className?: string;
  style?: CSSProperties;
  theme?: Partial<TtTheme>;
  metrics?: MetricType[];
  size?: SizeType;
}

const GAUGE_METRICS: MetricType[] = ['cpu', 'mem', 'disk', 'load', 'net'];
const INTERVALS = [1000, 2000, 5000, 10000, 30000];
const INTERVAL_LABELS = ['1s', '2s', '5s', '10s', '30s'];
const MAX_LOG = 120;

/* ── Shared animation styles (injected once) ─────────────────────────── */
const ANIM_ID = 'tt-dashboard-anims';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_ID)) {
  const el = document.createElement('style');
  el.id = ANIM_ID;
  el.textContent = `@keyframes tt-live-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }`;
  document.head.appendChild(el);
}

/* ── Logo (same as MetricsPanel) ─────────────────────────────────────── */
function TtLogo({ px, color }: { px: number; color: string }) {
  return (
    <svg width={px} height={px} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color }}>
      <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <polyline
        points="3.5,8 5.5,8 6.5,5 8,11 9.5,6 10.5,8 12.5,8"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Load score helpers (mirrors MetricsPanel) ───────────────────────── */
function calcLoadScore(load1: number, load5: number, load15: number): number {
  const l1 = load1 / 100,
    l5 = load5 / 100,
    l15 = load15 / 100;
  return Math.min(100, Math.round(((l1 * 0.5 + l5 * 0.3 + l15 * 0.2) / 4) * 100));
}
function loadScoreColor(score: number, t: TtTheme): string {
  if (score < 20) return t.faint;
  if (score < 45) return t.ok;
  if (score < 65) return t.warn;
  return t.crit;
}

/* ── Net saturation: normalise bytes/s to 0–10000 (cap at 200 MB/s) ─── */
const NET_MAX_BPS = 200 * 1024 * 1024;
function netPct(bps: number) {
  return Math.min(Math.round((bps / NET_MAX_BPS) * 10000), 10000);
}

/* ── Button group item style ─────────────────────────────────────────── */
function btnGroupItem(t: TtTheme, fontSize: number, pos: 'left' | 'mid' | 'right'): CSSProperties {
  const r = t.radius ?? 4;
  return {
    fontSize: fontSize - 1,
    padding: '3px 10px',
    background: t.btnBg,
    border: `1px solid ${t.border}`,
    borderLeft: pos === 'mid' || pos === 'right' ? 'none' : `1px solid ${t.border}`,
    borderRadius: pos === 'left' ? `${r}px 0 0 ${r}px` : pos === 'right' ? `0 ${r}px ${r}px 0` : 0,
    color: t.muted,
    cursor: 'pointer',
    fontFamily: t.font,
    transition: t.transition,
    whiteSpace: 'nowrap' as const,
  };
}

export function Dashboard({
  mode: modeProp,
  historySize = 60,
  showSysInfo = true,
  className,
  style,
  theme: themeProp,
  metrics = GAUGE_METRICS,
  size = 'm',
}: DashboardProps) {
  const { theme: base } = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);
  const sc = SIZE_SCALE[size];
  const show = (metric: MetricType) => metrics.includes(metric);

  const { client, metrics: m, stats, connected, sysinfo, streaming, setStreaming } = useMetrics();
  const [mode, setMode] = useState<DashboardMode>(modeProp ?? 'compact');
  const [intervalIdx, setIntervalIdx] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [wsLog, setWsLog] = useState<string[]>([]);
  const [expandedGauge, setExpandedGauge] = useState<MetricType | null>(null);
  const history = useRef<TtMetrics[]>([]);
  const prevMetrics = useRef<TtMetrics | null>(null);

  const allAlerts = useMemo(() => (m ? detectAlerts(m, prevMetrics.current) : []), [m]);
  const badge = useAlertBadge(allAlerts);

  const pushLog = (dir: string, msg: string) => {
    const ts = new Date().toLocaleTimeString('en', { hour12: false });
    setWsLog((prev) => {
      const next = [...prev, `[${ts}] ${dir} ${msg}`];
      return next.length > MAX_LOG ? next.slice(-MAX_LOG) : next;
    });
  };

  useEffect(() => {
    if (!m) return;
    history.current = [...history.current.slice(-(historySize - 1)), m];
    prevMetrics.current = m;
  }, [m, historySize]);

  useEffect(() => {
    if (connected && client) {
      client.getHistory(RING_L1, historySize);
      pushLog('→', `CMD_GET_HISTORY L1 max=${historySize}`);
    }
  }, [connected, client, historySize]);

  useEffect(() => {
    if (!client) return;
    const lastTs = { current: 0 };
    const onMetrics = (mx: TtMetrics) => {
      if (mx.timestamp === lastTs.current) return;
      lastTs.current = mx.timestamp;
      pushLog(
        '←',
        `PKT_METRICS cpu=${fmtPct(mx.cpu)} mem=${fmtPct(mx.mem)} rx=${fmtBytes(mx.netRx)}/s tx=${fmtBytes(mx.netTx)}/s`,
      );
    };
    const onAck = (a: { cmdType: number; status: number }) => {
      const names: Record<number, string> = {
        0x01: 'SET_INTERVAL',
        0x02: 'SET_ALERTS',
        0x03: 'GET_SNAPSHOT',
        0x10: 'GET_RING_STATS',
        0x11: 'GET_SYS_INFO',
        0x12: 'START',
        0x13: 'STOP',
      };
      pushLog(
        '←',
        `PKT_ACK cmd=${names[a.cmdType] ?? `0x${a.cmdType.toString(16)}`} status=${a.status === 0 ? 'OK' : 'ERR'}`,
      );
    };
    const onOpen = () => {
      pushLog('✓', 'connected');
      pushLog('→', 'CMD_GET_SYS_INFO');
      pushLog('→', 'CMD_GET_SNAPSHOT');
    };
    const onClose = (code: number) => pushLog('✗', `closed (${code})`);
    client.on('metrics', onMetrics);
    client.on('ack', onAck);
    client.on('open', onOpen);
    client.on('close', onClose);
    return () => {
      client.off('metrics', onMetrics);
      client.off('ack', onAck);
      client.off('open', onOpen);
      client.off('close', onClose);
    };
  }, [client]);

  /* ── Keyboard shortcuts ─────────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const gaugeOrder: MetricType[] = ['cpu', 'mem', 'disk', 'load', 'net'];
      switch (e.key) {
        case 's':
        case 'S':
          if (connected) {
            const next = !streaming;
            setStreaming(next);
            pushLog('→', next ? 'CMD_START' : 'CMD_STOP');
          }
          break;
        case 'r':
        case 'R':
          window.dispatchEvent(new CustomEvent('tt-gauge-reset'));
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5': {
          const metric = gaugeOrder[Number(e.key) - 1];
          if (metric && show(metric)) {
            setExpandedGauge((prev) => (prev === metric ? null : metric));
            if (mode === 'compact') setMode('expanded');
          }
          break;
        }
        case 'Escape':
          setExpandedGauge(null);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, streaming, mode, metrics]);

  /* ── Derived values ─────────────────────────────────────────────────── */
  const loadScore = m ? calcLoadScore(m.load1, m.load5, m.load15) : null;
  const loadColor = loadScore !== null ? loadScoreColor(loadScore, t) : t.faint;
  const liveColor = connected ? t.ok : t.muted;

  const hist = {
    cpu: history.current.map((x) => x.cpu),
    mem: history.current.map((x) => x.mem),
    disk: history.current.map((x) => x.duUsage),
    load: history.current.map((x) => calcLoadScore(x.load1, x.load5, x.load15) * 100),
    netTx: history.current.map((x) => x.netTx),
    netRx: history.current.map((x) => x.netRx),
  };

  const ringFill = stats
    ? {
        l1: (stats.l1.filled / Math.max(sysinfo?.slotsL1 ?? stats.l1.capacity, 1)) * 100,
        l2: (stats.l2.filled / Math.max(sysinfo?.slotsL2 ?? stats.l2.capacity, 1)) * 100,
        l3: (stats.l3.filled / Math.max(sysinfo?.slotsL3 ?? stats.l3.capacity, 1)) * 100,
      }
    : null;

  const gaugeSize = size === 'l' ? 112 : size === 's' ? 72 : 96;

  function toggleGauge(metric: MetricType) {
    setExpandedGauge((prev) => (prev === metric ? null : metric));
    if (mode === 'compact') setMode('expanded');
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className={className} style={{ ...s.root, fontSize: sc.font, gap: sc.gap, width: '100%', ...style }}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <TtLogo px={sc.font + 4} color={liveColor} />
        <span
          style={{
            fontSize: sc.font - 1,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: liveColor,
            animation: connected ? 'tt-live-pulse 2s ease-in-out infinite' : undefined,
          }}
        >
          {connected ? 'LIVE' : 'OFF'}
        </span>
        {/* Fixed-width alert badge slot */}
        <span style={{ minWidth: 88, height: sc.font + 4 }}>
          {badge && <span style={s.alert(badge.level)}>{badge.label}</span>}
        </span>
      </div>

      {/* ── SysInfo row ──────────────────────────────────────────────── */}
      {showSysInfo && sysinfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ color: t.text, fontSize: sc.font - 1, fontWeight: 600 }}>{sysinfo.hostname}</span>
          <span style={{ color: t.faint, fontSize: sc.font - 2 }}>·</span>
          <span style={{ color: t.muted, fontSize: sc.font - 2 }}>{sysinfo.osType}</span>
          <span style={{ color: t.faint, fontSize: sc.font - 2 }}>·</span>
          <span style={{ color: t.faint, fontSize: sc.font - 2 }}>up {fmtUptimeSec(sysinfo.uptimeSec)}</span>
        </div>
      )}

      <div style={s.divider} />

      {/* ── Gauges row ───────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${gaugeSize + 16}px, 1fr))`,
          gap: gaugeSize * 0.2,
          width: '100%',
        }}
      >
        {show('cpu') && (
          <Gauge
            label="CPU"
            value={m?.cpu ?? null}
            color={t.cpu}
            t={t}
            size={gaugeSize}
            valueLabel={m ? fmtPct(m.cpu) : undefined}
            subLabel={m ? `${m.nrRunning}/${m.nrTotal} proc` : undefined}
            sparkData={
              mode === 'expanded' && (expandedGauge === null || expandedGauge === 'cpu') ? hist.cpu : undefined
            }
            onClick={() => toggleGauge('cpu')}
          />
        )}
        {show('mem') && (
          <Gauge
            label="MEM"
            value={m?.mem ?? null}
            color={t.mem}
            t={t}
            size={gaugeSize}
            valueLabel={m ? fmtPct(m.mem) : undefined}
            subLabel={m ? `${fmtBytes(m.duTotal - m.duFree)} used` : undefined}
            sparkData={
              mode === 'expanded' && (expandedGauge === null || expandedGauge === 'mem') ? hist.mem : undefined
            }
            onClick={() => toggleGauge('mem')}
          />
        )}
        {show('disk') && (
          <Gauge
            label="DISK"
            value={m?.duUsage ?? null}
            color={t.disk}
            t={t}
            size={gaugeSize}
            valueLabel={m ? fmtPct(m.duUsage) : undefined}
            subLabel={m ? `${fmtBytes(m.duFree)} free` : undefined}
            sparkData={
              mode === 'expanded' && (expandedGauge === null || expandedGauge === 'disk') ? hist.disk : undefined
            }
            onClick={() => toggleGauge('disk')}
          />
        )}
        {show('load') && (
          <Gauge
            label="LOAD"
            value={loadScore !== null ? loadScore * 100 : null}
            max={10000}
            color={loadColor}
            t={t}
            size={gaugeSize}
            valueLabel={loadScore !== null ? `${loadScore}%` : undefined}
            subLabel={m ? `${fmtLoad(m.load1)} / ${fmtLoad(m.load5)} / ${fmtLoad(m.load15)}` : undefined}
            sparkData={
              mode === 'expanded' && (expandedGauge === null || expandedGauge === 'load') ? hist.load : undefined
            }
            onClick={() => toggleGauge('load')}
          />
        )}
        {show('net') && (
          <Gauge
            label="NET"
            value={m ? netPct(m.netTx) : null}
            value2={m ? netPct(m.netRx) : null}
            color={t.net}
            color2={t.mem}
            t={t}
            size={gaugeSize}
            valueLabel={m ? `↑${fmtBytes(m.netTx)}` : undefined}
            valueLabel2={m ? `↓${fmtBytes(m.netRx)}` : undefined}
            sparkData={
              mode === 'expanded' && (expandedGauge === null || expandedGauge === 'net') ? hist.netTx : undefined
            }
            sparkData2={
              mode === 'expanded' && (expandedGauge === null || expandedGauge === 'net') ? hist.netRx : undefined
            }
            onClick={() => toggleGauge('net')}
          />
        )}
      </div>

      {/* ── Ring Buffers ─────────────────────────────────────────────── */}
      {sysinfo && ringFill && (
        <>
          <div style={s.divider} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: t.muted, fontSize: sc.font - 2, letterSpacing: '0.06em' }}>RING BUFFERS</span>
            {(
              [
                { key: 'L1', fill: ringFill.l1, slots: sysinfo.slotsL1, interval: sysinfo.intervalMs },
                { key: 'L2', fill: ringFill.l2, slots: sysinfo.slotsL2, interval: sysinfo.aggL2Ms },
                { key: 'L3', fill: ringFill.l3, slots: sysinfo.slotsL3, interval: sysinfo.aggL3Ms },
              ] as const
            ).map(({ key, fill, slots, interval }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: t.faint, fontSize: sc.font - 2, minWidth: 16 }}>{key}</span>
                <div
                  style={{
                    flex: 1,
                    maxWidth: 120,
                    height: 4,
                    background: t.surface,
                    borderRadius: 99,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 99,
                      background: fill > 80 ? t.warn : t.ok,
                      width: `${Math.min(fill, 100)}%`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <span style={{ color: t.faint, fontSize: sc.font - 2, minWidth: 60 }}>
                  {slots} · {interval >= 1000 ? `${interval / 1000}s` : `${interval}ms`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={s.divider} />

      {/* ── Controls: unified button group ───────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
        {/* Start / Stop — plain text, no emoji */}
        {connected && (
          <button
            style={{ ...btnGroupItem(t, sc.font, 'left'), color: streaming ? t.warn : t.ok }}
            onClick={() => {
              const next = !streaming;
              setStreaming(next);
              pushLog('→', next ? 'CMD_START' : 'CMD_STOP');
            }}
          >
            {streaming ? 'stop' : 'start'}
          </button>
        )}

        {/* Interval buttons */}
        {INTERVAL_LABELS.map((l, i) => (
          <button
            key={i}
            style={{
              ...btnGroupItem(t, sc.font, 'mid'),
              color: intervalIdx === i ? t.text : t.muted,
              background: intervalIdx === i ? (t.bgAlt ?? t.border) : t.btnBg,
              fontWeight: intervalIdx === i ? 700 : 400,
            }}
            onClick={() => {
              setIntervalIdx(i);
              if (client) {
                client.setInterval(INTERVALS[i]);
                pushLog('→', `CMD_SET_INTERVAL: ${INTERVALS[i]}ms`);
              }
            }}
          >
            {l}
          </button>
        ))}

        {/* Log toggle */}
        <button
          style={{ ...btnGroupItem(t, sc.font, 'right'), color: consoleOpen ? t.text : t.muted }}
          onClick={() => setConsoleOpen((o) => !o)}
        >
          log
        </button>
      </div>

      {/* ── WS Console ───────────────────────────────────────────────── */}
      {consoleOpen && (
        <>
          <div style={s.divider} />
          <WsConsole log={wsLog} onClear={() => setWsLog([])} t={t} />
        </>
      )}
    </div>
  );
}
