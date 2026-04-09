/**
 * MetricsBar — pill/badge-style status bar.
 *
 * Each metric is rendered as an oval badge with a muted label on the left
 * and a colored value on the right. Badges wrap naturally and are evenly
 * spaced. Three size variants control badge height, font size and padding.
 */
import { useMemo, useRef, CSSProperties } from 'react';
import { useMetrics } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme } from '../../theme.js';
import { buildAlertState } from '../../utils/alerts.js';
import { fmtPct, fmtBytes, fmtLoad, fmtUptimeSec } from '../../utils/format.js';
import { MetricType, SysInfoType, SizeType, SIZE_SCALE, ALL_METRICS } from '../../utils/metrics.js';
import { AlertLamps, AlertState, MetricIcon } from './MetricItem.js';

export interface MetricsBarProps {
  className?: string;
  style?: CSSProperties;
  showAlerts?: boolean;
  theme?: Partial<TtTheme>;
  metrics?: MetricType[];
  /** System info fields to display as badges (order preserved). */
  sysInfo?: SysInfoType[];
  size?: SizeType;
}

/* ─── Badge sizes ─────────────────────────────────────────────────────────── */
const BADGE_H: Record<SizeType, number> = { s: 20, m: 26, l: 32 };
const BADGE_PX: Record<SizeType, number> = { s: 8,  m: 12, l: 16 };
const LABEL_FS: Record<SizeType, number> = { s: 9,  m: 10, l: 12 };
const VALUE_FS: Record<SizeType, number> = { s: 10, m: 12, l: 14 };
const GAP: Record<SizeType, number>      = { s: 4,  m: 6,  l: 8  };

/* ─── Keyframe injection (once) ──────────────────────────────────────────── */
const LIVE_ANIM_ID = 'tt-live-pulse';
if (typeof document !== 'undefined' && !document.getElementById(LIVE_ANIM_ID)) {
  const style = document.createElement('style');
  style.id = LIVE_ANIM_ID;
  style.textContent = `
    @keyframes tt-live-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.25; }
    }
  `;
  document.head.appendChild(style);
}

/* ─── Generic oval badge ─────────────────────────────────────────────────── */
function Badge({
  children, t, size, title, accentColor,
}: {
  children: React.ReactNode;
  t: TtTheme;
  size: SizeType;
  title?: string;
  /** Optional left border accent color */
  accentColor?: string;
}) {
  const h = BADGE_H[size];
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: BADGE_PX[size] * 0.5,
        height: h,
        paddingLeft: BADGE_PX[size],
        paddingRight: BADGE_PX[size],
        borderRadius: h / 2,
        border: `1px solid ${t.border}`,
        background: t.surface,
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        borderLeftColor: accentColor ?? t.border,
        borderLeftWidth: accentColor ? 2 : 1,
      }}
    >
      {children}
    </span>
  );
}

/* ─── Label + value inside a badge ──────────────────────────────────────── */
function BLabel({ children, size }: { children: React.ReactNode; size: SizeType }) {
  return (
    <span style={{ fontSize: LABEL_FS[size], opacity: 0.55, letterSpacing: '0.04em', lineHeight: 1 }}>
      {children}
    </span>
  );
}

/** In size='s' render a MetricIcon instead of a text label. */
function MetricLabel({ type, label, size, color }: {
  type: import('./MetricItem.js').MetricIconType;
  label: string;
  size: SizeType;
  color: string;
}) {
  if (size === 's') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', color, opacity: 0.7, lineHeight: 1 }}>
        <MetricIcon type={type} size={LABEL_FS['s'] + 2} />
      </span>
    );
  }
  return <BLabel size={size}>{label}</BLabel>;
}
function BValue({ children, color, size }: { children: React.ReactNode; color: string; size: SizeType }) {
  return (
    <span style={{ fontSize: VALUE_FS[size], color, fontVariantNumeric: 'tabular-nums', lineHeight: 1, fontWeight: 500 }}>
      {children}
    </span>
  );
}

/* ─── Logo SVG ───────────────────────────────────────────────────────────── */
function TtLogo({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <polyline points="3.5,8 5.5,8 6.5,5 8,11 9.5,6 10.5,8 12.5,8" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function MetricsBar({
  className, style,
  showAlerts = true,
  theme: themeProp,
  metrics = ALL_METRICS,
  sysInfo,
  size = 'm',
}: MetricsBarProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const { metrics: m, connected, sysinfo } = useMetrics();

  const prevRef = useRef(m);
  const alertState = useMemo(() => {
    const state = buildAlertState(m, prevRef.current);
    prevRef.current = m;
    return state;
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [m]);

  const gap = GAP[size];
  const logoSz = VALUE_FS[size] + 2;

  /* ─── Metric badge renderer (ordered by metrics array) ─────────────────── */
  function renderMetric(metric: MetricType) {
    switch (metric) {
      case 'cpu': return (
        <Badge key="cpu" t={t} size={size} title="CPU usage" accentColor={t.cpu}>
          <MetricLabel type="cpu" label={size === 'l' ? 'CPU usage' : 'CPU'} size={size} color={t.cpu} />
          <BValue color={t.cpu} size={size}>{m ? fmtPct(m.cpu) : '—'}</BValue>
        </Badge>
      );
      case 'mem': return (
        <Badge key="mem" t={t} size={size} title="Memory usage" accentColor={t.mem}>
          <MetricLabel type="mem" label={size === 'l' ? 'Memory usage' : 'MEM'} size={size} color={t.mem} />
          <BValue color={t.mem} size={size}>{m ? fmtPct(m.mem) : '—'}</BValue>
        </Badge>
      );
      case 'disk': return (
        <Badge key="disk" t={t} size={size} title="Disk usage" accentColor={t.disk}>
          <MetricLabel type="disk" label={size === 'l' ? 'Disk usage' : 'DISK'} size={size} color={t.disk} />
          <BValue color={t.disk} size={size}>{m ? fmtPct(m.duUsage) : '—'}</BValue>
        </Badge>
      );
      case 'load': return (
        <Badge key="load" t={t} size={size} title="Load average 1m / 5m / 15m" accentColor={t.load}>
          <MetricLabel type="load" label={size === 'l' ? 'Load average' : 'LOAD'} size={size} color={t.load} />
          <BValue color={t.load} size={size}>
            {m ? `${fmtLoad(m.load1)} / ${fmtLoad(m.load5)} / ${fmtLoad(m.load15)}` : '—'}
          </BValue>
        </Badge>
      );
      case 'net': return (
        <Badge key="net" t={t} size={size} title="Network TX / RX">
          {size === 'l' ? (<>
            <MetricLabel type="net" label="" size={size} color={t.muted} />
            <BLabel size={size}>Upload</BLabel>
            <BValue color={t.cpu} size={size}>↑ {m ? fmtBytes(m.netTx) : '—'}/s</BValue>
            <BLabel size={size}>Download</BLabel>
            <BValue color={t.mem} size={size}>↓ {m ? fmtBytes(m.netRx) : '—'}/s</BValue>
          </>) : (
            <>
              <MetricLabel type="net" label="NET" size={size} color={t.net} />
              <BValue color={t.cpu} size={size}>↑{m ? fmtBytes(m.netTx) : '—'}</BValue>
              <BValue color={t.mem} size={size}>↓{m ? fmtBytes(m.netRx) : '—'}</BValue>
            </>
          )}
        </Badge>
      );
      case 'proc': return (
        <Badge key="proc" t={t} size={size} title="Running / total processes">
          <MetricLabel type="proc" label={size === 'l' ? 'Processes' : 'PROC'} size={size} color={t.muted} />
          <BValue color={t.text} size={size}>{m ? `${m.nrRunning}/${m.nrTotal}` : '—'}</BValue>
        </Badge>
      );
      default: return null;
    }
  }

  /* ─── SysInfo badge renderer ────────────────────────────────────────────── */
  function renderSysInfo(field: SysInfoType) {
    if (!sysinfo) return null;
    switch (field) {
      case 'hostname': return (
        <Badge key="hostname" t={t} size={size} title="Hostname">
          <BLabel size={size}>host</BLabel>
          <BValue color={t.text} size={size}>{sysinfo.hostname}</BValue>
        </Badge>
      );
      case 'os-type': return (
        <Badge key="os-type" t={t} size={size} title="OS type">
          <BLabel size={size}>os</BLabel>
          <BValue color={t.muted} size={size}>{sysinfo.osType}</BValue>
        </Badge>
      );
      case 'uptime': return (
        <Badge key="uptime" t={t} size={size} title="System uptime">
          <BLabel size={size}>up</BLabel>
          <BValue color={t.faint} size={size}>{fmtUptimeSec(sysinfo.uptimeSec)}</BValue>
        </Badge>
      );
      case 'ringbufInfo': return (
        <Badge key="ringbufInfo" t={t} size={size} title="Ring buffer slots L1/L2/L3">
          <BLabel size={size}>buf</BLabel>
          <BValue color={t.faint} size={size}>
            {sysinfo.slotsL1}/{sysinfo.slotsL2}/{sysinfo.slotsL3}
          </BValue>
        </Badge>
      );
      default: return null;
    }
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex', flexWrap: 'wrap',
        alignItems: 'center',
        gap,
        fontFamily: t.font,
        color: t.text,
        background: t.bg,
        border: `${t.borderWidth}px solid ${t.border}`,
        borderRadius: t.radius,
        padding: gap,
        boxSizing: 'border-box',
        width: '100%',
        ...style,
      }}
    >
      {/* ── Logo + LIVE ── */}
      <Badge t={t} size={size} title={connected ? 'Connected' : 'Offline'} accentColor={connected ? t.ok : t.muted}>
        <span style={{ color: connected ? t.ok : t.muted, display: 'inline-flex', alignItems: 'center' }}>
          <TtLogo px={logoSz} />
        </span>
        <span style={{
          fontSize: LABEL_FS[size] + 1,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: connected ? t.ok : t.crit,
          animation: connected ? 'tt-live-pulse 2s ease-in-out infinite' : undefined,
          lineHeight: 1,
        }}>
          {connected ? 'LIVE' : 'OFF'}
        </span>
      </Badge>

      {/* ── Alert lamps ── */}
      {showAlerts && (
        <Badge t={t} size={size} title="Alert indicators">
          <AlertLamps state={alertState} t={t} size={size} />
        </Badge>
      )}

      {/* ── Metrics in array order ── */}
      {metrics.map(renderMetric)}

      {/* ── SysInfo badges in array order ── */}
      {sysInfo?.map(renderSysInfo)}
    </div>
  );
}
