/**
 * DiskMap — disk space visualisation with ring (donut) and matrix modes.
 *
 * Reads total/free from live metrics. External segments (e.g. from a REST API)
 * can be passed via the `segments` prop; the remainder is shown as "other".
 */
import { useMemo, useState, CSSProperties } from 'react';
import { useMetrics } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme } from '../../theme.js';
import { fmtBytes } from '../../utils/format.js';
import { SizeType, SIZE_SCALE } from '../../utils/metrics.js';
import { BytesDisplay } from '../BytesDisplay.js';

/** A named disk segment from an external source (e.g. REST API). */
export interface DiskSegment {
  label: string;
  bytes: number;
  /** Optional hex color override. Falls back to theme palette. */
  color?: string;
}

export interface DiskMapProps {
  /** External segments. Remainder shown as "other". */
  segments?: DiskSegment[];
  /** Visualisation mode. Default: "ring". */
  mode?: 'ring' | 'matrix';
  /** Matrix columns. Default: 22. */
  matrixCols?: number;
  /** Matrix rows. Default: 22. */
  matrixRows?: number;
  size?: SizeType;
  className?: string;
  style?: CSSProperties;
  theme?: Partial<TtTheme>;
}

/* Default palette cycles through theme metric colors then falls back to grays */
const PALETTE_KEYS: (keyof TtTheme)[] = ['cpu', 'mem', 'disk', 'net', 'load', 'warn', 'ok'];

function buildSegments(
  total: number,
  free: number,
  external: DiskSegment[],
  t: TtTheme,
): Array<{ label: string; bytes: number; color: string; pct: number }> {
  const used = total - free;
  const externalTotal = external.reduce((s, x) => s + x.bytes, 0);
  const other = Math.max(0, used - externalTotal);

  const raw: Array<{ label: string; bytes: number; color?: string }> = [
    ...external,
    ...(other > 0 ? [{ label: 'other', bytes: other }] : []),
    { label: 'free', bytes: free, color: t.faint },
  ];

  return raw.map((seg, i) => ({
    label: seg.label,
    bytes: seg.bytes,
    color: seg.color ?? (String(t[PALETTE_KEYS[i % PALETTE_KEYS.length]]) || '#888'),
    pct: total > 0 ? (seg.bytes / total) * 100 : 0,
  }));
}

/* ─── Ring (donut) mode ──────────────────────────────────────────────────── */
function RingChart({
  segs,
  total,
  t,
  size,
}: {
  segs: ReturnType<typeof buildSegments>;
  total: number;
  t: TtTheme;
  size: SizeType;
}) {
  const R = size === 'l' ? 80 : size === 's' ? 48 : 64;
  const SW = size === 'l' ? 22 : size === 's' ? 14 : 18;
  const CX = R + SW / 2 + 4;
  const CY = CX;
  const circumference = 2 * Math.PI * R;

  let offset = 0;
  const arcs = segs.map((seg) => {
    const len = (seg.pct / 100) * circumference;
    const arc = { ...seg, dashOffset: circumference - offset, dashLen: len };
    offset += len;
    return arc;
  });

  const usedPct = total > 0 ? ((total - (segs.find((s) => s.label === 'free')?.bytes ?? 0)) / total) * 100 : 0;
  const dim = CX * 2;

  return (
    <svg width={dim} height={dim} style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={t.surface} strokeWidth={SW} />
      {arcs.map((arc) => (
        <circle
          key={arc.label}
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={arc.color}
          strokeWidth={SW}
          strokeDasharray={`${arc.dashLen} ${circumference - arc.dashLen}`}
          strokeDashoffset={arc.dashOffset}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
      ))}
      {/* Center label */}
      <text
        x={CX}
        y={CY - 6}
        textAnchor="middle"
        fill={t.text}
        fontSize={size === 'l' ? 18 : size === 's' ? 12 : 15}
        fontWeight={700}
        fontFamily={t.font}
      >
        {usedPct.toFixed(0)}%
      </text>
      <text x={CX} y={CY + 10} textAnchor="middle" fill={t.muted} fontSize={size === 'l' ? 10 : 8} fontFamily={t.font}>
        used
      </text>
    </svg>
  );
}

/* ─── Matrix mode ────────────────────────────────────────────────────────── */
function MatrixChart({
  segs,
  cols,
  rows,
  t,
  size,
}: {
  segs: ReturnType<typeof buildSegments>;
  cols: number;
  rows: number;
  t: TtTheme;
  size: SizeType;
}) {
  const cellSize = size === 'l' ? 8 : size === 's' ? 4 : 6;
  const gap = 1;
  const total = cols * rows;

  // Build flat color array
  const cells = useMemo(() => {
    const arr: string[] = [];
    for (const seg of segs) {
      const count = Math.round((seg.pct / 100) * total);
      for (let i = 0; i < count && arr.length < total; i++) arr.push(seg.color);
    }
    while (arr.length < total) arr.push(t.surface);
    return arr;
  }, [segs, total, t.surface]);

  const w = cols * (cellSize + gap) - gap;
  const h = rows * (cellSize + gap) - gap;

  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }}>
      {cells.map((color, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <rect
            key={i}
            x={col * (cellSize + gap)}
            y={row * (cellSize + gap)}
            width={cellSize}
            height={cellSize}
            fill={color}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

/* ─── Legend ─────────────────────────────────────────────────────────────── */
function Legend({
  segs,
  total,
  t,
  size,
}: {
  segs: ReturnType<typeof buildSegments>;
  total: number;
  t: TtTheme;
  size: SizeType;
}) {
  const fs = SIZE_SCALE[size].font;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
      {segs.map((seg) => (
        <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: fs }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
          <span style={{ color: t.muted, flexShrink: 0, minWidth: 52, textTransform: 'capitalize' }}>{seg.label}</span>
          <span style={{ color: t.text, fontVariantNumeric: 'tabular-nums', marginLeft: 'auto', paddingLeft: 8 }}>
            <BytesDisplay bytes={seg.bytes} color={t.text} />
          </span>
          <span style={{ color: t.faint, fontSize: fs - 1, minWidth: 36, textAlign: 'right' }}>
            {seg.pct.toFixed(1)}%
          </span>
        </div>
      ))}
      <div
        style={{
          borderTop: `1px solid ${t.divider ?? t.border}`,
          marginTop: 2,
          paddingTop: 4,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: fs - 1,
          color: t.faint,
        }}
      >
        <span>Total</span>
        <span>
          <BytesDisplay bytes={total} />
        </span>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function DiskMap({
  segments = [],
  mode: modeProp,
  matrixCols = 22,
  matrixRows = 22,
  size = 'm',
  className,
  style,
  theme: themeProp,
}: DiskMapProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const sc = SIZE_SCALE[size];

  const [mode, setMode] = useState<'ring' | 'matrix'>(modeProp ?? 'ring');
  const { metrics: m } = useMetrics();

  const total = m?.duTotal ?? 0;
  const free = m?.duFree ?? 0;

  const segs = useMemo(
    () => buildSegments(total, free, segments, t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total, free, segments, t.cpu, t.mem, t.disk, t.net, t.load, t.faint, t.surface],
  );

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: sc.gap * 2,
        padding: sc.pad * 1.5,
        background: t.bg,
        border: `${t.borderWidth ?? 1}px solid ${t.border}`,
        borderRadius: t.radius,
        fontFamily: t.font,
        width: 'fit-content',
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: sc.font - 1, color: t.muted }}>Disk Map</span>
        {/* Mode toggle — only shown when modeProp is not controlled */}
        {!modeProp && (
          <div style={{ display: 'flex', gap: 4 }}>
            {(['ring', 'matrix'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  fontSize: sc.font - 2,
                  padding: '2px 8px',
                  border: `1px solid ${mode === m ? t.cpu : t.border}`,
                  borderRadius: 99,
                  background: mode === m ? t.cpu + '22' : 'transparent',
                  color: mode === m ? t.cpu : t.muted,
                  cursor: 'pointer',
                  fontFamily: t.font,
                }}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart + Legend */}
      <div style={{ display: 'flex', gap: sc.gap * 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {mode === 'ring' ? (
          <RingChart segs={segs} total={total} t={t} size={size} />
        ) : (
          <MatrixChart segs={segs} cols={matrixCols} rows={matrixRows} t={t} size={size} />
        )}
        <Legend segs={segs} total={total} t={t} size={size} />
      </div>
    </div>
  );
}
