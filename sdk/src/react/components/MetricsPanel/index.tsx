/**
 * MetricsPanel — vertical metrics card.
 *
 * Size semantics:
 *   's' — minimal: logo + live + system load score + metrics subset
 *   'm' — default: full set with bars, load score, disk bytes, compact net
 *   'l' — maximum: full labels, tooltips, disk bytes, net Upload/Download
 */
import { useMemo, useRef, useState, useEffect, CSSProperties } from 'react';
import { useMetrics } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme, themeStyles } from '../../theme.js';
import { useAlertBadge } from '../../hooks/useAlertBadge.js';
import { detectAlerts } from '../../utils/alerts.js';
import { fmtPct, fmtBytes, fmtLoad, fmtUptimeSec, bar } from '../../utils/format.js';
import { MetricType, SizeType, SIZE_SCALE, ALL_METRICS } from '../../utils/metrics.js';
import { loadTrend } from '../../utils/alerts.js';
import { MetricRow } from './MetricRow.js';

export interface MetricsPanelProps {
  className?: string;
  style?: CSSProperties;
  theme?: Partial<TtTheme>;
  metrics?: MetricType[];
  size?: SizeType;
  /** Layout columns: 1 = single column (default), 2 = two-column split */
  columns?: 1 | 2;
}

/* ── Keyframe injection (once) ─────────────────────────────────────────── */
const LIVE_ANIM_ID = 'tt-live-pulse';
if (typeof document !== 'undefined' && !document.getElementById(LIVE_ANIM_ID)) {
  const el = document.createElement('style');
  el.id = LIVE_ANIM_ID;
  el.textContent = `
    @keyframes tt-live-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
    @keyframes tt-arrow-wave-ltr {
      0%   { opacity: 0.15; }
      50%  { opacity: 1; }
      100% { opacity: 0.15; }
    }
    @keyframes tt-arrow-wave-rtl {
      0%   { opacity: 0.15; }
      50%  { opacity: 1; }
      100% { opacity: 0.15; }
    }
  `;
  document.head.appendChild(el);
}

/* ── Racing arrows for load avg ────────────────────────────────────────── */
const ARROW_COUNT = 8;

function LoadArrows({ trend, color, fontSize }: {
  trend: 'rising' | 'falling' | 'stable';
  color: string;
  fontSize: number;
}) {
  if (trend === 'stable') return null;
  const ltr = trend === 'rising';
  const char = ltr ? '▶' : '◀';
  const anim = ltr ? 'tt-arrow-wave-ltr' : 'tt-arrow-wave-rtl';
  const duration = 0.9; // seconds per full wave cycle
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1, lineHeight: 1 }}>
      {Array.from({ length: ARROW_COUNT }, (_, i) => {
        // stagger: ltr = left-to-right delay, rtl = right-to-left
        const idx = ltr ? i : ARROW_COUNT - 1 - i;
        const delay = (idx / ARROW_COUNT) * duration;
        return (
          <span
            key={i}
            style={{
              fontSize: fontSize - 1,
              color,
              animation: `${anim} ${duration}s ease-in-out ${delay.toFixed(2)}s infinite`,
              display: 'inline-block',
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

/* ── Logo SVG ───────────────────────────────────────────────────────────── */
function TtLogo({ px, color }: { px: number; color: string }) {
  return (
    <svg width={px} height={px} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color }}>
      <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <polyline points="3.5,8 5.5,8 6.5,5 8,11 9.5,6 10.5,8 12.5,8" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── System load score (0–100) ─────────────────────────────────────────── */
function calcLoadScore(load1: number, load5: number, load15: number): number {
  // load values are stored as integer * 100 (e.g. 125 = 1.25)
  // Weighted blend, cap at load=4.0 (reasonable for most systems)
  const l1 = load1 / 100, l5 = load5 / 100, l15 = load15 / 100;
  const raw = l1 * 0.5 + l5 * 0.3 + l15 * 0.2;
  return Math.min(100, Math.round((raw / 4) * 100));
}
function loadScoreColor(score: number, t: TtTheme): string {
  if (score < 20) return t.faint;
  if (score < 45) return t.ok;
  if (score < 65) return t.warn;
  return t.crit;
}

export function MetricsPanel({
  className, style, theme: themeProp,
  metrics = ALL_METRICS,
  size = 'm',
  columns = 1,
}: MetricsPanelProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);
  const sc = SIZE_SCALE[size];
  const { metrics: m, connected, sysinfo } = useMetrics();

  const prevRef = useRef(m);
  const allAlerts = useMemo(() => {
    const a = m ? detectAlerts(m, prevRef.current) : [];
    prevRef.current = m;
    return a;
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [m]);
  const badge = useAlertBadge(allAlerts);

  const loadScore = m ? calcLoadScore(m.load1, m.load5, m.load15) : null;
  const loadColor = loadScore !== null ? loadScoreColor(loadScore, t) : t.faint;
  const liveColor = connected ? t.ok : t.muted;

  // Live uptime counter: tick every second from the snapshot received at connect time
  const [uptimeDelta, setUptimeDelta] = useState(0);
  const connectTimeRef = useRef<number | null>(null);
  const baseUptimeRef = useRef<number>(0);
  useEffect(() => {
    if (!sysinfo) return;
    connectTimeRef.current = Date.now();
    baseUptimeRef.current = sysinfo.uptimeSec;
    setUptimeDelta(0);
    const id = setInterval(() => {
      setUptimeDelta(Math.floor((Date.now() - connectTimeRef.current!) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [sysinfo]);
  const currentUptime = sysinfo ? baseUptimeRef.current + uptimeDelta : null;

  /* ── Header: logo + live + uptime (shared) ────────────────────────────── */
  const headerS = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <TtLogo px={sc.font + 2} color={liveColor} />
      <span style={{
        fontSize: sc.font - 1, fontWeight: 700, letterSpacing: '0.08em',
        color: liveColor,
        animation: connected ? 'tt-live-pulse 2s ease-in-out infinite' : undefined,
      }}>
        {connected ? 'LIVE' : 'OFF'}
      </span>
      {sysinfo && (
        <span style={{ color: t.faint, fontSize: sc.font - 2 }} title="System uptime">
          up {fmtUptimeSec(currentUptime!)}
        </span>
      )}
    </div>
  );

  /* ── Header: logo + live + hostname + uptime + alerts (m/l) ───────────── */
  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <TtLogo px={sc.font + 2} color={liveColor} />
      <span style={{
        fontSize: sc.font - 1, fontWeight: 700, letterSpacing: '0.08em',
        color: liveColor,
        animation: connected ? 'tt-live-pulse 2s ease-in-out infinite' : undefined,
      }}>
        {connected ? 'LIVE' : 'OFF'}
      </span>
      {badge && <span style={s.alert(badge.level)}>{badge.label}</span>}
    </div>
  );

  /* ── Size 's': minimal card ─────────────────────────────────────────── */
  if (size === 's') {
    const has = (metric: MetricType) => metrics.includes(metric);
    return (
      <div className={className} style={{ ...s.root, fontSize: sc.font, gap: sc.gap, padding: sc.pad, width: 'fit-content', minWidth: 120, ...style }}>
        {headerS}
        <div style={s.divider} />

        {has('cpu') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: t.muted, minWidth: 28, fontSize: sc.font - 1 }}>CPU</span>
            <span style={{ color: t.cpu, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{m ? fmtPct(m.cpu) : '—'}</span>
          </div>
        )}
        {has('mem') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: t.muted, minWidth: 28, fontSize: sc.font - 1 }}>Mem</span>
            <span style={{ color: t.mem, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{m ? fmtPct(m.mem) : '—'}</span>
          </div>
        )}
        {has('disk') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: t.muted, minWidth: 28, fontSize: sc.font - 1 }}>Disk</span>
            <span style={{ color: t.disk, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{m ? fmtPct(m.duUsage) : '—'}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: t.muted, minWidth: 28, fontSize: sc.font - 1 }}>Load</span>
          {m && (() => {
            const sTrend = loadTrend(m);
            const arrow = sTrend === 'rising' ? '▲' : sTrend === 'falling' ? '▼' : '';
            const aColor = sTrend === 'rising' ? t.crit : sTrend === 'falling' ? t.ok : t.faint;
            return <>
              {arrow && <span style={{ color: aColor, fontSize: sc.font - 2, lineHeight: 1 }}>{arrow}</span>}
              <span style={{ color: loadColor, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{loadScore}%</span>
            </>;
          })()}
          {!m && <span style={{ color: loadColor, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>—</span>}
        </div>
        {has('net') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: t.muted, minWidth: 28, fontSize: sc.font - 1 }}>Net</span>
            <span style={{ color: t.net, fontVariantNumeric: 'tabular-nums' }}>↑{m ? fmtBytes(m.netTx) : '—'}</span>
            <span style={{ color: t.mem, fontVariantNumeric: 'tabular-nums' }}>↓{m ? fmtBytes(m.netRx) : '—'}</span>
          </div>
        )}
        {has('proc') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: t.muted, minWidth: 28, fontSize: sc.font - 1 }}>Proc</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{m ? `${m.nrRunning}/${m.nrTotal}` : '—'}</span>
          </div>
        )}
      </div>
    );
  }

  /* ── Size 'm' and 'l' ───────────────────────────────────────────────── */
  const isL = size === 'l';
  const labelW = isL ? 80 : 36;
  const lbl = (short: string, full: string) => isL ? full : short;
  const trend = m ? loadTrend(m) : 'stable';
  const arrowColor = trend === 'rising' ? t.crit : t.ok;

  /* ── Metric rows builder ────────────────────────────────────────────── */
  function renderMetricRows(metricList: MetricType[]) {
    return metricList.map((metric) => {
      switch (metric) {
        case 'cpu': return (
          <MetricRow key="cpu"
            label={lbl('CPU', 'CPU usage')} value={m ? fmtPct(m.cpu) : '—'}
            barStr={m ? bar(m.cpu) : null} color={t.cpu} s={s} fontSize={sc.font}
            labelWidth={labelW} tooltip={isL ? `CPU: ${m ? fmtPct(m.cpu) : '—'}` : undefined}
          />
        );
        case 'mem': return (
          <MetricRow key="mem"
            label={lbl('Mem', 'Memory')} value={m ? fmtPct(m.mem) : '—'}
            barStr={m ? bar(m.mem) : null} color={t.mem} s={s} fontSize={sc.font}
            labelWidth={labelW} tooltip={isL ? `Memory: ${m ? fmtPct(m.mem) : '—'}` : undefined}
          />
        );
        case 'disk': return (
          <div key="disk" style={{ display: 'contents' }}>
            <MetricRow
              label={lbl('Disk', 'Disk usage')} value={m ? fmtPct(m.duUsage) : '—'}
              barStr={m ? bar(m.duUsage) : null} color={t.disk} s={s} fontSize={sc.font}
              labelWidth={labelW} tooltip={isL ? `Disk: ${m ? fmtPct(m.duUsage) : '—'}` : undefined}
            />
            {m && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ minWidth: labelW }} />
                <span style={{ color: t.faint, fontSize: sc.font - 2 }}>
                  ({fmtBytes(m.duTotal - m.duFree)} / {fmtBytes(m.duTotal)})
                </span>
              </div>
            )}
          </div>
        );
        case 'load': return (
          <div key="load" style={{ display: 'contents' }}>
            <MetricRow
              label={lbl('Load', 'System load')} value={loadScore !== null ? `${loadScore}%` : '—'}
              barStr={loadScore !== null ? bar(loadScore * 100) : null} color={loadColor} s={s} fontSize={sc.font}
              labelWidth={labelW} tooltip={isL ? 'Overall system load score (0–100)' : undefined}
            />
            {m ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: t.muted, minWidth: labelW, fontSize: sc.font - 1, whiteSpace: 'nowrap' }}>
                  {lbl('L. avg', 'Load aver.')}
                </span>
                <LoadArrows trend={trend} color={arrowColor} fontSize={sc.font} />
                <span style={{ color: t.load, fontVariantNumeric: 'tabular-nums', fontSize: sc.font - 1 }}>
                  {fmtLoad(m.load1)} / {fmtLoad(m.load5)} / {fmtLoad(m.load15)}
                </span>
              </div>
            ) : (
              <MetricRow label={lbl('L. avg', 'Load aver.')} value="—" barStr={null} color={t.load} s={s} fontSize={sc.font} labelWidth={labelW} />
            )}
          </div>
        );
        case 'proc': return (
          <MetricRow key="proc"
            label={lbl('Proc', 'Processes')}
            value={m ? `${m.nrRunning} / ${m.nrTotal}` : '—'}
            barStr={m && m.nrTotal > 0 ? bar(Math.round((m.nrRunning / m.nrTotal) * 10000)) : null}
            color={t.text} s={s} fontSize={sc.font} labelWidth={labelW}
            tooltip={isL ? 'Running / total processes' : undefined}
          />
        );
        case 'net': return (
          <div key="net" style={{ display: 'contents' }}>
            <div style={s.divider} />
            {isL ? (<>
              <MetricRow label="Upload" value={m ? `↑ ${fmtBytes(m.netTx)}/s` : '—'}
                barStr={null} color={t.net} s={s} fontSize={sc.font} labelWidth={labelW} />
              <MetricRow label="Download" value={m ? `↓ ${fmtBytes(m.netRx)}/s` : '—'}
                barStr={null} color={t.mem} s={s} fontSize={sc.font} labelWidth={labelW} />
            </>) : (
              <MetricRow label={lbl('Net', 'Network')}
                value={m ? `↑${fmtBytes(m.netTx)}/s ↓${fmtBytes(m.netRx)}/s` : '—'}
                barStr={null} color={t.net} s={s} fontSize={sc.font} labelWidth={labelW} />
            )}
          </div>
        );
        default: return null;
      }
    });
  }

  /* ── Footer ─────────────────────────────────────────────────────────── */
  const footer = sysinfo ? (
    <>
      <div style={s.divider} />
      {isL && (<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ ...s.label, minWidth: labelW + 78, fontSize: sc.font - 2 }}>OS</span>
          <span style={{ color: t.faint, fontSize: sc.font - 1 }}>{sysinfo.osType}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ ...s.label, minWidth: labelW + 78, fontSize: sc.font - 2 }}>Buffers</span>
          <span style={{ color: t.faint, fontSize: sc.font - 1 }}>
            L1:{sysinfo.slotsL1} L2:{sysinfo.slotsL2} L3:{sysinfo.slotsL3}
          </span>
        </div>
      </>)}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: t.muted, fontSize: sc.font - 2 }}>{sysinfo.hostname}</span>
        <span style={{ color: t.faint, fontSize: sc.font - 2 }}>·</span>
        <span style={{ color: t.faint, fontSize: sc.font - 2 }}>up {fmtUptimeSec(currentUptime!)}</span>
      </div>
    </>
  ) : null;

  /* ── columns=2: split metrics into two groups ───────────────────────── */
  if (columns === 2) {
    const col1: MetricType[] = metrics.filter(m => ['cpu', 'mem', 'disk'].includes(m));
    const col2: MetricType[] = metrics.filter(m => ['load', 'net', 'proc'].includes(m));
    return (
      <div className={className} style={{ ...s.root, fontSize: sc.font, gap: sc.gap, padding: sc.pad, width: 'fit-content', ...style }}>
        {header}
        <div style={s.divider} />
        <div style={{ display: 'flex', gap: sc.gap * 3, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: sc.gap }}>
            {renderMetricRows(col1)}
          </div>
          <div style={{ width: 1, background: t.divider, alignSelf: 'stretch' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: sc.gap }}>
            {renderMetricRows(col2)}
            {footer}
          </div>
        </div>
      </div>
    );
  }

  /* ── columns=1 (default) ────────────────────────────────────────────── */
  return (
    <div className={className} style={{ ...s.root, fontSize: sc.font, gap: sc.gap, padding: sc.pad, width: 'fit-content', ...style }}>
      {header}
      <div style={s.divider} />
      {renderMetricRows(metrics)}
      {footer}
    </div>
  );
}
