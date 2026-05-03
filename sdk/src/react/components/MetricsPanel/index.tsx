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
import { useTheme, TtTheme, themeStyles, invertColor, dimColor } from '../../theme.js';
import { useAlertBadge } from '../../hooks/useAlertBadge.js';
import { detectAlerts } from '../../utils/alerts.js';
import { fmtPct, fmtBytes, fmtLoad, fmtUptimeSec, bar } from '../../utils/format.js';
import { MetricType, SizeType, SIZE_SCALE, ALL_METRICS } from '../../utils/metrics.js';
import { loadTrend, calcLoadScore } from '../../utils/alerts.js';
import { BarType, MetricRow } from './MetricRow.js';
import { BytesDisplay } from '../BytesDisplay.js';

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
const LIVE_ANIM_ID = 'tt-panel-anims';
if (typeof document !== 'undefined' && !document.getElementById(LIVE_ANIM_ID)) {
  const el = document.createElement('style');
  el.id = LIVE_ANIM_ID;
  el.textContent = `
    @keyframes tt-live-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
    @keyframes tt-chevron-wave {
      0%,100% { opacity: 0.12; }
      50%      { opacity: 1;    }
    }
  `;
  document.head.appendChild(el);
}

/* ── Block-char wave arrows for load avg ────────────────────────────────── */
// Uses the same block characters as the bar (▓/░) so it visually matches.
// Rising  (→): wave pulses left-to-right in red
// Falling (←): wave pulses right-to-left in green
// Each char animates opacity independently with staggered delay.
const ARROW_COUNT = 8;
// ltr chars: ramp up to full block then back — looks like a moving pulse
const LTR_CHARS = ['░', '░', '▒', '▓', '█', '▓', '▒', '░'] as const;
const RTL_CHARS = ['░', '▒', '▓', '█', '▓', '▒', '░', '░'] as const;

const CHARS_POINTS = ['●', '●', '●', '●', '●', '●', '●'] as const;

function LoadArrows({
  trend,
  color,
  faint,
  fontSize,
  bg,
  typeBar,
}: {
  trend: 'rising' | 'falling' | 'stable';
  color: string;
  faint: string;
  fontSize: number;
  bg: string;
  typeBar: BarType;
}) {
  if (trend === 'stable') return null;
  const ltr = trend === 'rising';
  const chars = typeBar == 'ascii' ? (ltr ? LTR_CHARS : RTL_CHARS) : CHARS_POINTS;
  const duration = 1.5;
  const brightColor = dimColor(color, bg);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: typeBar == 'ascii' ? 0 : 2.4,
        width: 72,
        flexShrink: 0,
        fontFamily: '"JetBrains Mono","Fira Code",monospace',
        fontSize: typeBar == 'ascii' ? fontSize : fontSize - 2,
        lineHeight: 1,
        letterSpacing: 1,
        color: typeBar == 'normal' ? color : brightColor,
      }}
    >
      {chars.map((ch, i) => {
        const idx = ltr ? i : ARROW_COUNT - 1 - i;
        const delay = (idx / ARROW_COUNT) * duration;
        const baseColor = ch === '░' ? faint : brightColor;
        return (
          <span
            key={i}
            style={{
              color: baseColor,
              animation: `tt-chevron-wave ${duration}s ease-in-out ${delay.toFixed(2)}s infinite`,
              display: 'inline-block',
            }}
          >
            {ch}
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

/* ── System load score (0–100) ─────────────────────────────────────────── */
function loadScoreColor(score: number, t: TtTheme): string {
  if (score < 20) return t.faint;
  if (score < 45) return t.ok;
  if (score < 65) return t.warn;
  return t.crit;
}

export function MetricsPanel({
  className,
  style,
  theme: themeProp,
  metrics = ALL_METRICS,
  size = 'm',
  columns = 1,
}: MetricsPanelProps) {
  const { theme: base } = useTheme();
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
      {badge && <span style={s.alert(badge.level)}>{badge.label}</span>}
    </div>
  );

  /* ── Size 's': minimal card ─────────────────────────────────────────── */
  if (size === 's') {
    const has = (metric: MetricType) => metrics.includes(metric);
    const row = (label: string, children: React.ReactNode) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: t.muted, minWidth: 28, fontSize: sc.font - 1 }}>{label}</span>
        {children}
      </div>
    );
    return (
      <div
        className={className}
        style={{
          ...s.root,
          fontSize: sc.font,
          gap: sc.gap,
          padding: sc.pad,
          width: 'fit-content',
          minWidth: 120,
          ...style,
        }}
      >
        {headerS}
        <div style={s.divider} />
        {has('cpu') &&
          row(
            'CPU',
            <span style={{ color: t.cpu, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {m ? fmtPct(m.cpu) : '—'}
            </span>,
          )}
        {has('mem') &&
          row(
            'Mem',
            <span style={{ color: t.mem, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {m ? fmtPct(m.mem) : '—'}
            </span>,
          )}
        {has('disk') &&
          row(
            'Disk',
            <span style={{ color: t.disk, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {m ? fmtPct(m.duUsage) : '—'}
            </span>,
          )}
        {row(
          'Load',
          m ? (
            (() => {
              const sTrend = loadTrend(m);
              const aColor = sTrend === 'rising' ? t.crit : sTrend === 'falling' ? t.ok : t.faint;
              const arrow = sTrend === 'rising' ? '▲' : sTrend === 'falling' ? '▼' : '';
              return (
                <>
                  {arrow && <span style={{ color: aColor, fontSize: sc.font - 2 }}>{arrow}</span>}
                  <span style={{ color: loadColor, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {loadScore}%
                  </span>
                </>
              );
            })()
          ) : (
            <span style={{ color: t.faint }}>—</span>
          ),
        )}
        {has('net') &&
          row(
            'Net',
            <>
              <span style={{ color: t.net, fontVariantNumeric: 'tabular-nums' }}>
                ↑{m ? <BytesDisplay bytes={m.netTx} color={t.net} /> : '—'}
              </span>
              <span style={{ color: t.divider, fontSize: sc.font - 2 }}>/</span>
              <span style={{ color: t.mem, fontVariantNumeric: 'tabular-nums' }}>
                ↓{m ? <BytesDisplay bytes={m.netRx} color={t.mem} /> : '—'}
              </span>
            </>,
          )}
        {has('proc') &&
          row(
            'Proc',
            <>
              <span style={{ color: t.text, fontVariantNumeric: 'tabular-nums' }}>{m ? m.nrRunning : '—'}</span>
              <span style={{ color: t.divider, fontSize: sc.font - 2 }}>/</span>
              <span style={{ color: t.muted, fontVariantNumeric: 'tabular-nums' }}>{m ? m.nrTotal : '—'}</span>
            </>,
          )}
      </div>
    );
  }

  /* ── Size 'm' and 'l' ───────────────────────────────────────────────── */
  const isL = size === 'l';
  const labelW = isL ? 84 : 46;
  const lbl = (short: string, full: string) => (isL ? full : short);
  const trend = m ? loadTrend(m) : 'stable';
  const arrowColor = trend === 'rising' ? t.crit : t.ok;
  const typeBar: BarType =
    t.themeName == 'shadcnui' || t.themeName == 'heroui' || t.themeName == 'dracula' || t.themeName == 'material'
      ? 'normal'
      : 'ascii';

  function renderMetricRows(metricList: MetricType[]) {
    const mr = (
      key: string,
      label: string,
      value: string,
      barStr: string | null,
      barType: BarType,
      color: string,
      tooltip?: string,
    ) => (
      <MetricRow
        key={key}
        label={label}
        value={value}
        barStr={barStr}
        barType={barType}
        color={color}
        s={s}
        t={t}
        fontSize={sc.font}
        labelWidth={labelW}
        tooltip={tooltip}
      />
    );
    return metricList.map((metric) => {
      switch (metric) {
        case 'cpu':
          return mr(
            'cpu',
            lbl('CPU', 'CPU usage'),
            m ? fmtPct(m.cpu) : '—',
            m ? bar(m.cpu) : null,
            typeBar,
            t.cpu,
            isL ? `CPU: ${m ? fmtPct(m.cpu) : '—'}` : undefined,
          );
        case 'mem':
          return mr(
            'mem',
            lbl('Mem', 'Memory'),
            m ? fmtPct(m.mem) : '—',
            m ? bar(m.mem) : null,
            typeBar,
            t.mem,
            isL ? `Memory: ${m ? fmtPct(m.mem) : '—'}` : undefined,
          );
        case 'disk':
          return (
            <div key="disk" style={{ display: 'contents' }}>
              {mr(
                'disk-row',
                lbl('Disk', 'Disk usage'),
                m ? fmtPct(m.duUsage) : '—',
                m ? bar(m.duUsage) : null,
                typeBar,
                t.disk,
                isL ? `Disk: ${m ? fmtPct(m.duUsage) : '—'}` : undefined,
              )}
              {m && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ minWidth: labelW }} />
                  <span style={{ color: t.faint, fontSize: sc.font - 2 }}>
                    (<BytesDisplay bytes={m.duTotal - m.duFree} /> / <BytesDisplay bytes={m.duTotal} />)
                  </span>
                </div>
              )}
            </div>
          );
        case 'load':
          return (
            <div key="load" style={{ display: 'contents' }}>
              {mr(
                'load-row',
                lbl('Load', 'System load'),
                loadScore !== null ? `${loadScore}%` : '—',
                loadScore !== null ? bar(loadScore * 100) : null,
                typeBar,
                loadColor,
                isL ? 'Overall system load score (0–100)' : undefined,
              )}
              {m ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: t.muted, minWidth: labelW, fontSize: sc.font - 2, whiteSpace: 'nowrap' }}>
                      {lbl('L. avg', 'Load aver.')}
                    </span>
                    <LoadArrows
                      trend={trend}
                      color={arrowColor}
                      faint={t.faint}
                      fontSize={sc.font}
                      bg={t.bg}
                      typeBar={typeBar}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ minWidth: labelW }} />
                    <span style={{ color: t.faint, fontSize: sc.font - 2, fontVariantNumeric: 'tabular-nums' }}>
                      ({fmtLoad(m.load1)} / {fmtLoad(m.load5)} / {fmtLoad(m.load15)})
                    </span>
                  </div>
                </>
              ) : (
                mr('load-avg', lbl('L. avg', 'Load aver.'), '—', null, typeBar, t.load)
              )}
            </div>
          );
        case 'proc':
          return (
            <div key="proc" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: t.muted, minWidth: labelW, fontSize: sc.font - 2, whiteSpace: 'nowrap' }}>
                {lbl('Proc', 'Processes')}
              </span>
              <span style={{ color: t.text, fontSize: sc.font, fontVariantNumeric: 'tabular-nums' }}>
                {m ? m.nrRunning : '—'}
              </span>
              <span style={{ color: t.faint, fontSize: sc.font - 2 }}>/</span>
              <span style={{ color: t.muted, fontSize: sc.font, fontVariantNumeric: 'tabular-nums' }}>
                {m ? m.nrTotal : '—'}
              </span>
            </div>
          );
        case 'net':
          return (
            <div key="net" style={{ display: 'contents' }}>
              {isL ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: t.muted, minWidth: labelW, fontSize: sc.font - 2, whiteSpace: 'nowrap' }}>
                      Upload
                    </span>
                    <span style={{ fontSize: sc.font }}>
                      ↑ {m ? <BytesDisplay bytes={m.netTx} color={t.net} perSec /> : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: t.muted, minWidth: labelW, fontSize: sc.font - 2, whiteSpace: 'nowrap' }}>
                      Download
                    </span>
                    <span style={{ fontSize: sc.font }}>
                      ↓ {m ? <BytesDisplay bytes={m.netRx} color={invertColor(t.net, t.mem, t.net)} perSec /> : '—'}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: t.muted, minWidth: labelW, fontSize: sc.font - 2, whiteSpace: 'nowrap' }}>
                    {lbl('Net', 'Network')}
                  </span>
                  <span style={{ fontSize: sc.font }}>↑{m ? <BytesDisplay bytes={m.netTx} color={t.net} /> : '—'}</span>
                  <span style={{ color: t.faint, fontSize: sc.font - 2 }}>/</span>
                  <span style={{ fontSize: sc.font }}>↓{m ? <BytesDisplay bytes={m.netRx} color={t.mem} /> : '—'}</span>
                </div>
              )}
            </div>
          );
        default:
          return null;
      }
    });
  }

  /* ── Footer ─────────────────────────────────────────────────────────── */
  const footer = sysinfo ? (
    <>
      <div style={s.divider} />
      {isL && (
        <>
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
        </>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: t.muted, fontSize: sc.font - 2 }}>{sysinfo.hostname}</span>
        <span style={{ color: t.faint, fontSize: sc.font - 2 }}>·</span>
        <span style={{ color: t.faint, fontSize: sc.font - 2 }}>up {fmtUptimeSec(currentUptime!)}</span>
      </div>
    </>
  ) : null;

  /* ── columns=2: balanced split ─────────────────────────────────────── */
  if (columns === 2) {
    // Distribute metrics evenly: first half in col1, second half in col2
    const mid = Math.ceil(metrics.length / 2);
    const col1 = metrics.slice(0, mid);
    const col2 = metrics.slice(mid);
    return (
      <div
        className={className}
        style={{
          ...s.root,
          fontSize: sc.font,
          gap: sc.gap,
          padding: sc.pad,
          width: 'fit-content',
          ...style,
        }}
      >
        {header}
        <div style={s.divider} />
        <div style={{ display: 'flex', gap: sc.gap * 3, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: sc.gap }}>{renderMetricRows(col1)}</div>
          <div style={{ width: 1, background: t.divider, alignSelf: 'stretch' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: sc.gap }}>{renderMetricRows(col2)}</div>
        </div>
        {footer}
      </div>
    );
  }

  /* ── columns=1 (default) ────────────────────────────────────────────── */
  return (
    <div
      className={className}
      style={{ ...s.root, fontSize: sc.font, gap: sc.gap, padding: sc.pad, width: 'fit-content', ...style }}
    >
      {header}
      <div style={s.divider} />
      {renderMetricRows(metrics)}
      {footer}
    </div>
  );
}
