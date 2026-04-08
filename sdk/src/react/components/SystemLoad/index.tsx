/**
 * SystemLoad — semi-circular gauge showing overall system load.
 *
 * Analyses load averages and process counts to produce a single 0–100 score
 * with colour-coded severity levels and a trend indicator (↑ / ↓).
 */
import { useMemo, CSSProperties } from 'react';
import { useMetrics } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme, themeStyles } from '../../theme.js';
import { fmtLoad, fmtUptimeSec } from '../../utils/format.js';
import { SizeType, SIZE_SCALE } from '../../utils/metrics.js';

export interface SystemLoadProps {
  className?: string;
  style?: CSSProperties;
  /** Override theme tokens for this instance only. */
  theme?: Partial<TtTheme>;
  /** Component size variant. Default: 'm'. */
  size?: SizeType;
}

type LoadLevel = 'idle' | 'normal' | 'elevated' | 'high' | 'critical';

interface LoadAnalysis {
  level: LoadLevel;
  /** Normalised score 0–100 for the gauge arc. */
  score: number;
  trend: 'rising' | 'stable' | 'falling';
  label: string;
  detail: string;
}

/**
 * Compute a single load score and severity level from raw metrics.
 *
 * Score formula: weighted blend `l1*0.5 + l5*0.3 + l15*0.2`, capped at 200%
 * load (score 100). Trend is derived from the difference between 1m and 15m
 * averages (threshold: ±0.15).
 */
function analyzeLoad(
  load1: number, load5: number, load15: number,
  nrRunning: number, nrTotal: number,
): LoadAnalysis {
  const l1 = load1 / 100;
  const l5 = load5 / 100;
  const l15 = load15 / 100;

  const raw = l1 * 0.5 + l5 * 0.3 + l15 * 0.2;
  const score = Math.min(100, Math.round((raw / 2) * 100));

  const diff = l1 - l15;
  const trend = diff > 0.15 ? 'rising' : diff < -0.15 ? 'falling' : 'stable';

  let level: LoadLevel;
  if (score < 20)      level = 'idle';
  else if (score < 45) level = 'normal';
  else if (score < 65) level = 'elevated';
  else if (score < 85) level = 'high';
  else                 level = 'critical';

  const labels: Record<LoadLevel, string> = {
    idle: 'Idle', normal: 'Normal', elevated: 'Elevated', high: 'High', critical: 'Critical',
  };
  const trendSym = trend === 'rising' ? ' ↑' : trend === 'falling' ? ' ↓' : '';
  const detail = `${l1.toFixed(2)} / ${l5.toFixed(2)} / ${l15.toFixed(2)}  ·  ${nrRunning}/${nrTotal} proc`;

  return { level, score, trend, label: labels[level] + trendSym, detail };
}

function levelColor(level: LoadLevel, t: TtTheme): string {
  if (level === 'idle')   return t.faint;
  if (level === 'normal') return t.ok;
  if (level === 'elevated') return t.warn;
  return t.crit;
}

/**
 * Semi-circular gauge with animated arc, score label and trend indicator.
 *
 * @param props.size - 's' | 'm' | 'l' — scales gauge radius and font sizes.
 */
export function SystemLoad({ className, style, theme: themeProp, size = 'm' }: SystemLoadProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);
  const sc = SIZE_SCALE[size];

  const { metrics: m } = useMetrics();

  const analysis = useMemo<LoadAnalysis | null>(() => {
    if (!m) return null;
    return analyzeLoad(m.load1, m.load5, m.load15, m.nrRunning, m.nrTotal);
  }, [m]);

  const color = analysis ? levelColor(analysis.level, t) : t.faint;
  const score = analysis?.score ?? 0;

  const R = 54;
  const CX = 70;
  const CY = 70;
  const arcLen = Math.PI * R;
  const filled = (score / 100) * arcLen;
  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  const strokeW = size === 'l' ? 14 : size === 's' ? 8 : 10;
  const scoreFontSize = size === 'l' ? 28 : size === 's' ? 18 : 22;

  return (
    <div className={className} style={{ ...s.root, fontSize: sc.font, gap: sc.gap, padding: sc.pad, width: 'fit-content', minWidth: 160, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: sc.font - 1, color: t.muted }}>System Load</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={CX * 2} height={CY + 16} style={{ overflow: 'visible' }}>
          <path d={arcPath} fill="none" stroke={t.surface} strokeWidth={strokeW} strokeLinecap="round" />
          <path
            d={arcPath} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
            strokeDasharray={`${filled} ${arcLen}`}
            style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.5s ease' }}
          />
          <text x={CX} y={CY - 4} textAnchor="middle" fill={color} fontSize={scoreFontSize} fontWeight={700} fontFamily={t.font}>
            {score}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" fill={t.muted} fontSize={size === 'l' ? 11 : 9} fontFamily={t.font}>
            {analysis?.label ?? '—'}
          </text>
        </svg>
      </div>

      <div style={{ textAlign: 'center', color: t.faint, fontSize: sc.font - 2 }}>
        {analysis?.detail ?? '—'}
      </div>

      <div style={{ height: 4, background: t.surface, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease, background 0.5s ease' }} />
      </div>
    </div>
  );
}
