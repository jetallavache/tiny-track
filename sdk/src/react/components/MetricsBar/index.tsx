/**
 * MetricsBar — pill/badge-style status bar.
 *
 * Each metric is rendered as an oval badge with a muted label on the left
 * and a colored value on the right. Badges wrap naturally and are evenly
 * spaced. Three size variants control badge height, font size and padding.
 */
import { useMemo, useRef, useState, useEffect, createContext, useContext, CSSProperties } from 'react';
import { useMetrics } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme } from '../../theme.js';
import { buildAlertState, detectAlerts } from '../../utils/alerts.js';
import { fmtPct, fmtBytes, fmtLoad, fmtUptimeSec } from '../../utils/format.js';
import { BytesDisplay } from '../BytesDisplay.js';
import { MetricType, SysInfoType, SizeType, SIZE_SCALE, ALL_METRICS } from '../../utils/metrics.js';
import { AlertLamps, AlertState, MetricIcon } from './MetricItem.js';
import { usePopupPosition, usePopupClamp } from './usePopupPosition.js';

const BarWidthContext = createContext<number>(320);

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
const BADGE_PX: Record<SizeType, number> = { s: 8, m: 12, l: 16 };
const LABEL_FS: Record<SizeType, number> = { s: 9, m: 10, l: 12 };
const VALUE_FS: Record<SizeType, number> = { s: 10, m: 12, l: 14 };
const GAP: Record<SizeType, number> = { s: 4, m: 6, l: 8 };

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
  children,
  t,
  size,
  title,
  accentColor,
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
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: BADGE_PX[size] * 0.5,
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

/* ─── Badge with click-to-popup ──────────────────────────────────────────── */
function BadgePopup({
  children,
  t,
  size,
  accentColor,
  popupTitle,
  popupContent,
}: {
  children: React.ReactNode;
  t: TtTheme;
  size: SizeType;
  accentColor?: string;
  popupTitle: string;
  popupContent: React.ReactNode;
}) {
  const barWidth = useContext(BarWidthContext);
  const desiredWidth =
    window.innerWidth < 640 ? Math.min(barWidth / 2, window.innerWidth - 16) : Math.round(barWidth * 0.35);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: desiredWidth });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLSpanElement>(null);
  const h = BADGE_H[size];
  const fs = LABEL_FS[size];

  const initialPos = usePopupPosition(triggerRef, popupRef, open, desiredWidth);
  useEffect(() => {
    if (open) setPos(initialPos);
  }, [open, initialPos]);
  usePopupClamp(popupRef, triggerRef, open, setPos, desiredWidth);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      )
        setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <span
        ref={triggerRef}
        role="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: BADGE_PX[size] * 0.5,
          height: h,
          paddingLeft: BADGE_PX[size],
          paddingRight: BADGE_PX[size],
          borderRadius: h / 2,
          border: `1px solid ${t.border}`,
          background: t.surface,
          boxSizing: 'border-box',
          whiteSpace: 'nowrap',
          borderLeftColor: accentColor ?? t.border,
          borderLeftWidth: accentColor ? 2 : 1,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {children}
      </span>
      {open && (
        <span
          ref={popupRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            boxShadow: `0 4px 16px ${t.shadowColor ?? '#0006'}`,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: t.font,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              padding: '5px 10px',
              flexShrink: 0,
              fontSize: fs - 1,
              color: t.muted,
              letterSpacing: '0.06em',
              borderBottom: `1px solid ${t.divider ?? t.border}`,
              background: t.bgAlt ?? t.bg,
            }}
          >
            {popupTitle}
          </span>
          <span style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
            {popupContent}
          </span>
        </span>
      )}
    </span>
  );
}

/* ─── Label + value inside a badge ──────────────────────────────────────── */
function BLabel({ children, size }: { children: React.ReactNode; size: SizeType }) {
  return (
    <span style={{ fontSize: LABEL_FS[size], opacity: 0.55, letterSpacing: '0.04em', lineHeight: 1 }}>{children}</span>
  );
}

/** In size='s' render a MetricIcon instead of a text label. */
function MetricLabel({
  type,
  label,
  size,
  color,
  theme,
}: {
  type: import('./MetricItem.js').MetricIconType;
  label: string;
  size: SizeType;
  color: string;
  theme?: TtTheme;
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
    <span
      style={{ fontSize: VALUE_FS[size], color, fontVariantNumeric: 'tabular-nums', lineHeight: 1, fontWeight: 500 }}
    >
      {children}
    </span>
  );
}

/* ─── Logo SVG ───────────────────────────────────────────────────────────── */
function TtLogo({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
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

/* ─── Popup detail row ───────────────────────────────────────────────────── */
function PopupRow({
  label,
  value,
  color,
  t,
  size,
}: {
  label: string;
  value: string;
  color?: string;
  t: TtTheme;
  size: SizeType;
}) {
  const fs = LABEL_FS[size];
  return (
    <span
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: fs + 1 }}
    >
      <span style={{ color: t.muted, flexShrink: 0 }}>{label}</span>
      <span
        style={{
          color: color ?? t.text,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
          wordBreak: 'break-all',
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </span>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function MetricsBar({
  className,
  style,
  showAlerts = true,
  theme: themeProp,
  metrics = ALL_METRICS,
  sysInfo,
  size = 'm',
}: MetricsBarProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const { metrics: m, connected, sysinfo } = useMetrics();

  const barRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(320);
  useEffect(() => {
    if (!barRef.current) return;
    const ro = new ResizeObserver(([e]) => setBarWidth(e.contentRect.width));
    ro.observe(barRef.current);
    return () => ro.disconnect();
  }, []);

  const prevRef = useRef(m);
  const alertState = useMemo(() => {
    const state = buildAlertState(m, prevRef.current);
    prevRef.current = m;
    return state;
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [m]);

  const alerts = useMemo(() => detectAlerts(m ?? ({} as any), prevRef.current), [m]);

  const gap = GAP[size];
  const logoSz = VALUE_FS[size] + 2;

  /* ─── Metric badge renderer (ordered by metrics array) ─────────────────── */
  function renderMetric(metric: MetricType) {
    switch (metric) {
      case 'cpu':
        return (
          <BadgePopup
            key="cpu"
            t={t}
            size={size}
            accentColor={t.cpu}
            popupTitle="CPU"
            popupContent={
              <>
                <PopupRow label="Usage" value={m ? fmtPct(m.cpu) : '—'} color={t.cpu} t={t} size={size} />
                <PopupRow label="Running procs" value={m ? String(m.nrRunning) : '—'} t={t} size={size} />
                <PopupRow label="Total procs" value={m ? String(m.nrTotal) : '—'} t={t} size={size} />
              </>
            }
          >
            <MetricLabel type="cpu" label={size === 'l' ? 'CPU usage' : 'CPU'} size={size} color={t.cpu} theme={t} />
            <BValue color={t.cpu} size={size}>
              {m ? fmtPct(m.cpu) : '—'}
            </BValue>
          </BadgePopup>
        );
      case 'mem':
        return (
          <BadgePopup
            key="mem"
            t={t}
            size={size}
            accentColor={t.mem}
            popupTitle="Memory"
            popupContent={
              <>
                <PopupRow label="Usage" value={m ? fmtPct(m.mem) : '—'} color={t.mem} t={t} size={size} />
              </>
            }
          >
            <MetricLabel type="mem" label={size === 'l' ? 'Memory usage' : 'MEM'} size={size} color={t.mem} theme={t} />
            <BValue color={t.mem} size={size}>
              {m ? fmtPct(m.mem) : '—'}
            </BValue>
          </BadgePopup>
        );
      case 'disk':
        return (
          <BadgePopup
            key="disk"
            t={t}
            size={size}
            accentColor={t.disk}
            popupTitle="Disk"
            popupContent={
              <>
                <PopupRow label="Usage" value={m ? fmtPct(m.duUsage) : '—'} color={t.disk} t={t} size={size} />
                <PopupRow label="Total" value={m ? fmtBytes(m.duTotal) : '—'} t={t} size={size} />
                <PopupRow label="Free" value={m ? fmtBytes(m.duFree) : '—'} color={t.ok} t={t} size={size} />
              </>
            }
          >
            <MetricLabel
              type="disk"
              label={size === 'l' ? 'Disk usage' : 'DISK'}
              size={size}
              color={t.disk}
              theme={t}
            />
            <BValue color={t.disk} size={size}>
              {m ? fmtPct(m.duUsage) : '—'}
            </BValue>
          </BadgePopup>
        );
      case 'load':
        return (
          <BadgePopup
            key="load"
            t={t}
            size={size}
            accentColor={t.load}
            popupTitle="Load average"
            popupContent={
              <>
                <PopupRow label="1 min" value={m ? fmtLoad(m.load1) : '—'} color={t.load} t={t} size={size} />
                <PopupRow label="5 min" value={m ? fmtLoad(m.load5) : '—'} t={t} size={size} />
                <PopupRow label="15 min" value={m ? fmtLoad(m.load15) : '—'} color={t.muted} t={t} size={size} />
              </>
            }
          >
            <MetricLabel
              type="load"
              label={size === 'l' ? 'Load average' : 'LOAD'}
              size={size}
              color={t.load}
              theme={t}
            />
            <BValue color={t.load} size={size}>
              {m ? `${fmtLoad(m.load1)} / ${fmtLoad(m.load5)} / ${fmtLoad(m.load15)}` : '—'}
            </BValue>
          </BadgePopup>
        );
      case 'net':
        return (
          <BadgePopup
            key="net"
            t={t}
            size={size}
            popupTitle="Network"
            popupContent={
              <>
                <PopupRow
                  label="Upload (TX)"
                  value={m ? fmtBytes(m.netTx) + '/s' : '—'}
                  color={t.cpu}
                  t={t}
                  size={size}
                />
                <PopupRow
                  label="Download (RX)"
                  value={m ? fmtBytes(m.netRx) + '/s' : '—'}
                  color={t.mem}
                  t={t}
                  size={size}
                />
              </>
            }
          >
            {size === 'l' ? (
              <>
                <MetricLabel type="net" label="" size={size} color={t.muted} />
                <BLabel size={size}>Upload</BLabel>
                <BValue color={t.cpu} size={size}>
                  ↑ {m ? <BytesDisplay bytes={m.netTx} color={t.cpu} perSec /> : '—'}
                </BValue>
                <BLabel size={size}>Download</BLabel>
                <BValue color={t.mem} size={size}>
                  ↓ {m ? <BytesDisplay bytes={m.netRx} color={t.mem} perSec /> : '—'}
                </BValue>
              </>
            ) : (
              <>
                <MetricLabel type="net" label="NET" size={size} color={t.net} />
                <BValue color={t.cpu} size={size}>
                  ↑{m ? <BytesDisplay bytes={m.netTx} color={t.cpu} /> : '—'}
                </BValue>
                <BValue color={t.mem} size={size}>
                  ↓{m ? <BytesDisplay bytes={m.netRx} color={t.mem} /> : '—'}
                </BValue>
              </>
            )}
          </BadgePopup>
        );
      case 'proc':
        return (
          <BadgePopup
            key="proc"
            t={t}
            size={size}
            popupTitle="Processes"
            popupContent={
              <>
                <PopupRow label="Running" value={m ? String(m.nrRunning) : '—'} color={t.warn} t={t} size={size} />
                <PopupRow label="Total" value={m ? String(m.nrTotal) : '—'} t={t} size={size} />
              </>
            }
          >
            <MetricLabel
              type="proc"
              label={size === 'l' ? 'Processes' : 'PROC'}
              size={size}
              color={t.muted}
              theme={t}
            />
            <BValue color={t.text} size={size}>
              {m ? `${m.nrRunning}/${m.nrTotal}` : '—'}
            </BValue>
          </BadgePopup>
        );
      default:
        return null;
    }
  }

  /* ─── SysInfo badge renderer ────────────────────────────────────────────── */
  function renderSysInfo(field: SysInfoType) {
    if (!sysinfo) return null;
    switch (field) {
      case 'hostname':
        return (
          <BadgePopup
            key="hostname"
            t={t}
            size={size}
            popupTitle="Host"
            popupContent={
              <>
                <PopupRow label="Hostname" value={sysinfo.hostname} t={t} size={size} />
                <PopupRow label="OS" value={sysinfo.osType} t={t} size={size} />
              </>
            }
          >
            <BLabel size={size}>host</BLabel>
            <BValue color={t.text} size={size}>
              {sysinfo.hostname}
            </BValue>
          </BadgePopup>
        );
      case 'os-type':
        return (
          <BadgePopup
            key="os-type"
            t={t}
            size={size}
            popupTitle="OS"
            popupContent={
              <>
                <PopupRow label="Type" value={sysinfo.osType} t={t} size={size} />
              </>
            }
          >
            <BLabel size={size}>os</BLabel>
            <BValue color={t.muted} size={size}>
              {sysinfo.osType}
            </BValue>
          </BadgePopup>
        );
      case 'uptime':
        return (
          <BadgePopup
            key="uptime"
            t={t}
            size={size}
            popupTitle="Uptime"
            popupContent={
              <>
                <PopupRow label="Up" value={fmtUptimeSec(sysinfo.uptimeSec)} color={t.ok} t={t} size={size} />
                <PopupRow label="Seconds" value={String(sysinfo.uptimeSec)} t={t} size={size} />
              </>
            }
          >
            <BLabel size={size}>up</BLabel>
            <BValue color={t.faint} size={size}>
              {fmtUptimeSec(sysinfo.uptimeSec)}
            </BValue>
          </BadgePopup>
        );
      case 'ringbufInfo':
        return (
          <BadgePopup
            key="ringbufInfo"
            t={t}
            size={size}
            popupTitle="Ring buffers"
            popupContent={
              <>
                <PopupRow label="L1 slots" value={String(sysinfo.slotsL1)} t={t} size={size} />
                <PopupRow label="L2 slots" value={String(sysinfo.slotsL2)} t={t} size={size} />
                <PopupRow label="L3 slots" value={String(sysinfo.slotsL3)} t={t} size={size} />
                <PopupRow label="Interval" value={sysinfo.intervalMs + ' ms'} color={t.muted} t={t} size={size} />
                <PopupRow label="Agg L2" value={sysinfo.aggL2Ms / 1000 + ' s'} color={t.muted} t={t} size={size} />
                <PopupRow label="Agg L3" value={sysinfo.aggL3Ms / 1000 + ' s'} color={t.muted} t={t} size={size} />
              </>
            }
          >
            <BLabel size={size}>buf</BLabel>
            <BValue color={t.faint} size={size}>
              {sysinfo.slotsL1}/{sysinfo.slotsL2}/{sysinfo.slotsL3}
            </BValue>
          </BadgePopup>
        );
      default:
        return null;
    }
  }

  return (
    <BarWidthContext.Provider value={barWidth}>
      <div
        ref={barRef}
        className={className}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
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
          <span
            style={{
              fontSize: LABEL_FS[size] + 1,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: connected ? t.ok : t.crit,
              animation: connected ? 'tt-live-pulse 2s ease-in-out infinite' : undefined,
              lineHeight: 1,
            }}
          >
            {connected ? 'LIVE' : 'OFF'}
          </span>
        </Badge>

        {/* ── Alert lamps ── */}
        {showAlerts && (
          <Badge t={t} size={size} title="Alert indicators">
            <AlertLamps
              state={alertState}
              alerts={alerts}
              t={t}
              size={size}
              barWidth={barWidth}
              osType={sysinfo?.osType}
            />
          </Badge>
        )}

        {/* ── Metrics in array order ── */}
        {metrics.map(renderMetric)}

        {/* ── SysInfo badges in array order ── */}
        {sysInfo?.map(renderSysInfo)}
      </div>
    </BarWidthContext.Provider>
  );
}
