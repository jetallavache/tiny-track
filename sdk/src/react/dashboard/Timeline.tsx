import { useState, useEffect, useRef, useCallback, CSSProperties, useMemo } from 'react';
import { useTinyTrack } from '../TinyTrackProvider.js';
import { useTheme, TtTheme, themeStyles } from '../theme.js';
import { TtMetrics, TtHistoryResp } from '../../client.js';
import { RING_L1, RING_L2, RING_L3 } from '../../proto.js';
import { fmtPct, fmtBytes, fmtLoad } from './utils.js';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export type TimelineMetric = 'cpu' | 'mem' | 'load' | 'net' | 'disk';

export interface TimelineProps {
  /** Which metric to visualise. Default: 'cpu' */
  metric?: TimelineMetric;
  /** Height of each ring row in px. Default: 40 */
  rowHeight?: number;
  className?: string;
  style?: CSSProperties;
  theme?: Partial<TtTheme>;
}

const RINGS = [
  { level: RING_L1, label: 'L1 · 1s', span: 3600, fmt: (ts: number) => fmtTime(ts) },
  { level: RING_L2, label: 'L2 · 1m', span: 86400, fmt: (ts: number) => fmtHour(ts) },
  { level: RING_L3, label: 'L3 · 1h', span: 7 * 86400, fmt: (ts: number) => fmtDay(ts) },
] as const;

const METRIC_COLOR: Record<TimelineMetric, string> = {
  cpu: '#4ade80',
  mem: '#60a5fa',
  load: '#a78bfa',
  net: '#f59e0b',
  disk: '#fb923c',
};

const METRIC_LABEL: Record<TimelineMetric, string> = {
  cpu: 'CPU',
  mem: 'Mem',
  load: 'Load',
  net: 'Net',
  disk: 'Disk',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Timeline({ metric = 'cpu', rowHeight = 40, className, style, theme: themeProp }: TimelineProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);
  const { client, connected } = useTinyTrack();
  const [samples, setSamples] = useState<Record<number, TtMetrics[]>>({
    [RING_L1]: [],
    [RING_L2]: [],
    [RING_L3]: [],
  });
  const color = METRIC_COLOR[metric];

  // Accumulate history per ring level
  const addSamples = useCallback((level: number, incoming: TtMetrics[]) => {
    setSamples((prev) => {
      const merged = [...prev[level], ...incoming];
      const map = new Map(merged.map((m) => [m.timestamp, m]));
      return { ...prev, [level]: [...map.values()].sort((a, b) => a.timestamp - b.timestamp) };
    });
  }, []);

  useEffect(() => {
    if (!connected || !client) return;
    client.getHistory(RING_L1, 3600);
    client.getHistory(RING_L2, 1440);
    client.getHistory(RING_L3, 168);
    const onHistory = (r: TtHistoryResp) => addSamples(r.level, r.samples);
    const onMetrics = (m: TtMetrics) => addSamples(RING_L1, [m]);
    client.on('history', onHistory);
    client.on('metrics', onMetrics);
    return () => {
      client.off('history', onHistory);
      client.off('metrics', onMetrics);
    };
  }, [connected, client, addSamples]);

  return (
    <div className={className} style={{ ...s.root, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Timeline · {METRIC_LABEL[metric]}</span>
        <span style={{ fontSize: 9, padding: '1px 5px', background: t.surface, borderRadius: t.radius, color }}>
          {METRIC_LABEL[metric]}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: t.faint }}>scroll →</span>
      </div>
      <div style={s.divider} />
      {RINGS.map((ring) => (
        <TimelineRow
          key={ring.level}
          label={ring.label}
          data={samples[ring.level]}
          metric={metric}
          color={color}
          rowHeight={rowHeight}
          spanSec={ring.span}
          fmtTick={ring.fmt}
          t={t}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single ring row with horizontal scroll
// ---------------------------------------------------------------------------

interface TimelineRowProps {
  label: string;
  data: TtMetrics[];
  metric: TimelineMetric;
  color: string;
  rowHeight: number;
  spanSec: number;
  fmtTick: (ts: number) => string;
  t: TtTheme;
}

function TimelineRow({ label, data, metric, color, rowHeight, spanSec, fmtTick, t }: TimelineRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; text: string } | null>(null);

  // Auto-scroll to right (latest) when new data arrives
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [data.length]);

  const values = useMemo(() => data.map((m) => extractValue(m, metric)), [data, metric]);
  const maxVal = metric === 'cpu' || metric === 'mem' || metric === 'disk' ? 10000 : Math.max(...values, 1);

  // Canvas-like: each sample = 4px wide bar
  const BAR_W = 4;
  const totalW = Math.max(data.length * BAR_W, 600);
  const H = rowHeight;
  const latest = data[data.length - 1];
  const latestVal = latest ? extractValue(latest, metric) : null;

  // Tick marks: every ~80px
  const tickInterval = Math.max(1, Math.floor(80 / BAR_W));
  const ticks: { x: number; label: string }[] = [];
  data.forEach((m, i) => {
    if (i % tickInterval === 0) ticks.push({ x: i * BAR_W, label: fmtTick(m.timestamp) });
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const idx = Math.floor(x / BAR_W);
      if (idx >= 0 && idx < data.length) {
        const m = data[idx];
        const v = extractValue(m, metric);
        setTooltip({ x, text: `${fmtTick(m.timestamp)}  ${formatValue(v, metric)}` });
      }
    },
    [data, metric, fmtTick],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: t.muted, fontSize: 10, minWidth: 72 }}>{label}</span>
        <span style={{ color, fontSize: 11, fontWeight: 600 }}>
          {latestVal !== null ? formatValue(latestVal, metric) : '—'}
        </span>
        <span style={{ color: t.faint, fontSize: 9, marginLeft: 'auto' }}>{data.length}pts</span>
      </div>

      <div
        ref={scrollRef}
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          background: t.surface,
          borderRadius: t.radius,
          border: `1px solid ${t.divider}`,
          height: H + 16,
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', width: totalW, height: H + 16 }}>
          <svg
            width={totalW}
            height={H}
            style={{ display: 'block', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
          >
            {values.map((v, i) => {
              const barH = Math.max(1, (v / maxVal) * H);
              return (
                <rect
                  key={i}
                  x={i * BAR_W}
                  y={H - barH}
                  width={BAR_W - 1}
                  height={barH}
                  fill={color}
                  opacity={0.3 + (v / maxVal) * 0.7}
                />
              );
            })}
            {tooltip && (
              <line x1={tooltip.x} y1={0} x2={tooltip.x} y2={H} stroke={t.text} strokeWidth={1} opacity={0.3} />
            )}
          </svg>

          <div style={{ position: 'relative', height: 16, overflow: 'hidden' }}>
            {ticks.map((tk, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  top: 0,
                  fontSize: 9,
                  color: t.faint,
                  whiteSpace: 'nowrap',
                  transform: 'translateX(-50%)',
                  left: tk.x,
                }}
              >
                {tk.label}
              </span>
            ))}
          </div>

          {/* Tooltip bubble */}
          {tooltip && (
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: tooltip.x + 6,
                fontSize: 10,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: t.radius,
                padding: '2px 6px',
                color: t.text,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              {tooltip.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractValue(m: TtMetrics, metric: TimelineMetric): number {
  switch (metric) {
    case 'cpu':
      return m.cpu;
    case 'mem':
      return m.mem;
    case 'load':
      return m.load1;
    case 'net':
      return m.netRx + m.netTx;
    case 'disk':
      return m.duUsage;
  }
}

function formatValue(val: number, metric: TimelineMetric): string {
  if (metric === 'cpu' || metric === 'mem' || metric === 'disk') return fmtPct(val);
  if (metric === 'load') return fmtLoad(val);
  if (metric === 'net') return fmtBytes(val) + '/s';
  return String(val);
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fmtHour(ts: number): string {
  return new Date(ts).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function fmtDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}h`;
}
