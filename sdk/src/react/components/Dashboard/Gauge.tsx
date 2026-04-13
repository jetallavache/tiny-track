/**
 * Gauge — SVG arc speedometer.
 *
 * Features:
 *  - Dual-arc mode (e.g. Net TX outer / RX inner)
 *  - Card wrapper with surface/border/radius
 *  - Status stripe at top of card (ok/warn/crit color)
 *  - Pulsing glow animation at crit level
 *  - Arc draw-in animation on mount (stroke-dasharray)
 *  - subLabel: secondary info line below value (e.g. "8.2 / 16 GB")
 *  - Hover tooltip: session min/max
 */
import { useState, useEffect, useRef } from 'react';
import { TtTheme } from '../../theme.js';

export interface GaugeProps {
  label: string;
  value: number | null;       // 0–max
  value2?: number | null;     // dual-arc secondary value
  max?: number;               // default 10000
  valueLabel?: string;        // formatted primary value
  valueLabel2?: string;       // formatted secondary value (dual mode)
  /** Secondary info shown below value, e.g. "8.2 / 16 GB" */
  subLabel?: string;
  /** Sparkline data — rendered as area chart at bottom of card */
  sparkData?: number[];
  /** Second sparkline (e.g. Net RX alongside TX) */
  sparkData2?: number[];
  /** Max for sparkline Y-axis. Defaults to max of sparkData. */
  sparkMax?: number;
  color: string;
  color2?: string;
  t: TtTheme;
  size?: number;
  onClick?: () => void;
}

const ARC_START = 210;
const ARC_SWEEP = 300;

/* ── Inject keyframes once ─────────────────────────────────────────────── */
const ANIM_ID = 'tt-gauge-anims';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_ID)) {
  const el = document.createElement('style');
  el.id = ANIM_ID;
  el.textContent = `
    @keyframes tt-gauge-crit-pulse {
      0%,100% { opacity: 1; }
      50%      { opacity: 0.35; }
    }
  `;
  document.head.appendChild(el);
}

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

/** Compute stroke-dasharray / stroke-dashoffset for arc fill animation. */
function arcDash(r: number, pct: number, totalSweepDeg: number) {
  const circumference = 2 * Math.PI * r;
  const arcLen = (totalSweepDeg / 360) * circumference;
  const filled = (pct / 100) * arcLen;
  return { dasharray: arcLen, dashoffset: arcLen - filled };
}

/** Full-width sparkline rendered at the bottom of a Gauge card. */
function InlineSparkline({
  data, data2, max, color, color2, t,
}: {
  data: number[];
  data2?: number[];
  max?: number;
  color: string;
  color2?: string;
  t: TtTheme;
}) {
  const W = 200, H = 28;
  const allVals = data2 ? [...data, ...data2] : data;
  const m = max ?? Math.max(...allVals, 1);

  function toPoints(vals: number[]) {
    return vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * W;
      const y = H - (v / m) * (H - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
  }

  const pts1 = toPoints(data);
  const area1 = `0,${H} ${pts1.join(' ')} ${W},${H}`;
  const pts2 = data2 && data2.length >= 2 ? toPoints(data2) : null;
  const area2 = pts2 ? `0,${H} ${pts2.join(' ')} ${W},${H}` : null;

  // Use theme bg as fill base so it blends with card background
  const fill1 = color + '30';
  const fill2 = (color2 ?? color) + '28';

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: H, overflow: 'hidden',
      borderRadius: `0 0 ${t.radius ?? 6}px ${t.radius ?? 6}px`,
    }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {/* Area fills */}
        <polygon points={area1} fill={fill1} />
        {area2 && <polygon points={area2} fill={fill2} />}
        {/* Lines */}
        <polyline points={pts1.join(' ')} fill="none" stroke={color}
          strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
        {pts2 && (
          <polyline points={pts2.join(' ')} fill="none" stroke={color2 ?? color}
            strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
        )}
      </svg>
    </div>
  );
}

export function Gauge({
  label, value, value2, max = 10000,
  valueLabel, valueLabel2, subLabel,
  sparkData, sparkData2, sparkMax,
  color, color2, t, size = 96, onClick,
}: GaugeProps) {
  const cx = size / 2, cy = size / 2;
  const dual   = value2 !== undefined && value2 !== null;
  const rOuter = size * (dual ? 0.40 : 0.38);
  const rInner = size * 0.30;
  const sw      = size * 0.07;
  const swInner = size * 0.055;

  /* ── Session min/max ─────────────────────────────────────────────────── */
  const minRef = useRef<number | null>(null);
  const maxRef = useRef<number | null>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (value === null || value === undefined) return;
    const pct = (value / max) * 100;
    if (minRef.current === null || pct < minRef.current) minRef.current = pct;
    if (maxRef.current === null || pct > maxRef.current) maxRef.current = pct;
  }, [value, max]);

  useEffect(() => {
    const onReset = () => { minRef.current = null; maxRef.current = null; };
    window.addEventListener('tt-gauge-reset', onReset);
    return () => window.removeEventListener('tt-gauge-reset', onReset);
  }, []);

  /* ── Mount animation: animate from 0 → current on first render ───────── */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const hasValue = value !== null && value !== undefined;
  const pct  = hasValue ? Math.min((value!  / max) * 100, 100) : 0;
  const pct2 = (value2 !== null && value2 !== undefined) ? Math.min((value2 / max) * 100, 100) : 0;

  // Arc always uses metric color — level shown only via stripe + glow
  const isCrit = pct >= 80;
  const isWarn = pct >= 60;
  const trackColor = t.bgAlt ?? t.surface ?? '#1e2533';

  // stroke-dasharray animation
  const outerDash = arcDash(rOuter, mounted ? pct  : 0, ARC_SWEEP);
  const innerDash = arcDash(rInner, mounted ? pct2 : 0, ARC_SWEEP);

  // Status stripe: ok/warn/crit independent of metric color
  const stripeColor = isCrit ? t.crit : isWarn ? t.warn : pct > 0 ? t.ok : t.faint;

  const cardPad = size * 0.12;

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
        gap: size * 0.04,
        cursor: onClick ? 'pointer' : 'default',
        background: t.surface,
        border: `1px solid ${isCrit ? t.crit + '88' : isWarn ? t.warn + '55' : t.border}`,
        borderRadius: t.radius ?? 6,
        padding: `${cardPad * 1.2}px ${cardPad}px ${sparkData && sparkData.length >= 2 ? 28 + cardPad * 0.4 : cardPad * 0.8}px`,
        overflow: 'hidden',
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: isCrit
          ? `0 0 ${size * 0.18}px ${t.crit}33`
          : `0 2px 8px ${t.shadowColor ?? '#0004'}`,
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* ── Status stripe ──────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3,
        background: stripeColor,
        transition: 'background 0.4s ease',
        animation: isCrit ? 'tt-gauge-crit-pulse 1.4s ease-in-out infinite' : undefined,
      }} />

      {/* ── SVG arc ────────────────────────────────────────────────────── */}
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {/* Outer track */}
        <path d={arcPath(cx, cy, rOuter, ARC_START, ARC_START + ARC_SWEEP)}
          fill="none" stroke={trackColor} strokeWidth={sw} strokeLinecap="round" />

        {/* Outer fill — metric color always, no warn/crit override */}
        {hasValue && (
          <path d={arcPath(cx, cy, rOuter, ARC_START, ARC_START + ARC_SWEEP)}
            fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={outerDash.dasharray}
            strokeDashoffset={outerDash.dashoffset}
            style={{
              transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)',
              filter: isCrit ? `drop-shadow(0 0 ${size * 0.07}px ${t.crit}99)` : undefined,
              animation: isCrit ? 'tt-gauge-crit-pulse 1.4s ease-in-out infinite' : undefined,
            }} />
        )}

        {/* Inner arc (dual mode) */}
        {dual && (
          <>
            <path d={arcPath(cx, cy, rInner, ARC_START, ARC_START + ARC_SWEEP)}
              fill="none" stroke={trackColor} strokeWidth={swInner} strokeLinecap="round" />
            {value2 !== null && value2 !== undefined && (
              <path d={arcPath(cx, cy, rInner, ARC_START, ARC_START + ARC_SWEEP)}
                fill="none" stroke={color2 ?? t.mem} strokeWidth={swInner} strokeLinecap="round"
                strokeDasharray={innerDash.dasharray}
                strokeDashoffset={innerDash.dashoffset}
                style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }} />
            )}
          </>
        )}

        {/* Center value */}
        <text x={cx} y={cy + (dual || subLabel ? -size * 0.06 : size * 0.06)}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={size * (dual ? 0.14 : 0.18)} fontWeight={700}
          fill={hasValue ? t.text : t.faint}
          fontFamily={t.font ?? 'inherit'}>
          {valueLabel ?? (hasValue ? `${Math.round(pct)}%` : '—')}
        </text>

        {/* Dual secondary label */}
        {dual && valueLabel2 && (
          <text x={cx} y={cy + size * 0.08}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.12} fontWeight={600}
            fill={color2 ?? t.mem} fontFamily={t.font ?? 'inherit'}>
            {valueLabel2}
          </text>
        )}

        {/* subLabel (secondary info) */}
        {subLabel && (
          <text x={cx} y={cy + size * (dual ? 0.2 : 0.22)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.105}
            fill={t.faint} fontFamily={t.font ?? 'inherit'}>
            {subLabel}
          </text>
        )}
      </svg>

      {/* ── Metric label ───────────────────────────────────────────────── */}
      <span style={{
        fontSize: size * 0.13, color: t.text,
        letterSpacing: '0.06em', fontWeight: 600,
        marginTop: -size * 0.06,
        opacity: 0.7,
      }}>
        {label}
      </span>

      {/* ── Sparkline at bottom of card ────────────────────────────────── */}
      {sparkData && sparkData.length >= 2 && (
        <InlineSparkline data={sparkData} data2={sparkData2} max={sparkMax} color={color} color2={color2} t={t} />
      )}

      {/* ── Hover tooltip: session min/max ─────────────────────────────── */}
      {hover && !dual && (minRef.current !== null || maxRef.current !== null) && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6, zIndex: 100,
          background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: t.radius ?? 4, padding: '4px 8px',
          fontSize: size * 0.12, color: t.text, whiteSpace: 'nowrap',
          boxShadow: `0 2px 8px ${t.shadowColor ?? '#0006'}`,
          fontFamily: t.font ?? 'inherit',
          pointerEvents: 'none',
        }}>
          <span style={{ color: t.muted }}>min </span>
          <span style={{ color: t.ok }}>{minRef.current !== null ? `${Math.round(minRef.current)}%` : '—'}</span>
          <span style={{ color: t.faint }}> · </span>
          <span style={{ color: t.muted }}>max </span>
          <span style={{ color: t.crit }}>{maxRef.current !== null ? `${Math.round(maxRef.current)}%` : '—'}</span>
        </div>
      )}
    </div>
  );
}
