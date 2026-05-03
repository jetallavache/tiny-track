/**
 * SystemLoad — semi-circular gauge showing overall system load.
 *
 * Score and trend use the same functions as MetricsPanel and alerts.ts
 * so all components show consistent values.
 */
import { useMemo, CSSProperties } from 'react';
import { useMetrics } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme, themeStyles } from '../../theme.js';
import { fmtLoad } from '../../utils/format.js';
import { SizeType, SIZE_SCALE } from '../../utils/metrics.js';
import { calcLoadScore, loadTrend } from '../../utils/alerts.js';

export interface SystemLoadProps {
  className?: string;
  style?: CSSProperties;
  theme?: Partial<TtTheme>;
  size?: SizeType;
}

type LoadLevel = 'idle' | 'normal' | 'elevated' | 'high' | 'critical';

function scoreToLevel(score: number): LoadLevel {
  if (score < 20) return 'idle';
  if (score < 45) return 'normal';
  if (score < 65) return 'elevated';
  if (score < 85) return 'high';
  return 'critical';
}

function levelColor(level: LoadLevel, t: TtTheme): string {
  if (level === 'idle') return t.faint;
  if (level === 'normal') return t.ok;
  if (level === 'elevated') return t.warn;
  return t.crit;
}

const LEVEL_LABEL: Record<LoadLevel, string> = {
  idle: 'Idle',
  normal: 'Normal',
  elevated: 'Elevated',
  high: 'High',
  critical: 'Critical',
};

export function SystemLoad({ className, style, theme: themeProp, size = 'm' }: SystemLoadProps) {
  const { theme: base } = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const s = themeStyles(t);
  const sc = SIZE_SCALE[size];

  const { metrics: m } = useMetrics();

  const analysis = useMemo(() => {
    if (!m) return null;
    const score = calcLoadScore(m.load1, m.load5, m.load15);
    const trend = loadTrend(m);
    const level = scoreToLevel(score);
    const trendSym = trend === 'rising' ? ' ↑' : trend === 'falling' ? ' ↓' : '';
    const detail = `${fmtLoad(m.load1)} / ${fmtLoad(m.load5)} / ${fmtLoad(m.load15)}  ·  ${m.nrRunning}/${m.nrTotal} proc`;
    return { score, level, label: LEVEL_LABEL[level] + trendSym, detail };
  }, [m]);

  const score = analysis?.score ?? 0;
  const color = analysis ? levelColor(analysis.level, t) : t.faint;

  const R = 54;
  const CX = 70;
  const CY = 70;
  const arcLen = Math.PI * R;
  const filled = (score / 100) * arcLen;
  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  const strokeW = size === 'l' ? 14 : size === 's' ? 8 : 10;
  const scoreFontSize = size === 'l' ? 28 : size === 's' ? 18 : 22;

  return (
    <div
      className={className}
      style={{
        ...s.root,
        fontSize: sc.font,
        gap: sc.gap,
        padding: sc.pad,
        width: 'fit-content',
        minWidth: 160,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: sc.font - 1, color: t.muted }}>System Load</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={CX * 2} height={CY + 16} style={{ overflow: 'visible' }}>
          <path d={arcPath} fill="none" stroke={t.surface} strokeWidth={strokeW} strokeLinecap="round" />
          <path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${arcLen}`}
            style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.5s ease' }}
          />
          <text
            x={CX}
            y={CY - 4}
            textAnchor="middle"
            fill={color}
            fontSize={scoreFontSize}
            fontWeight={700}
            fontFamily={t.font}
          >
            {score}
          </text>
          <text
            x={CX}
            y={CY + 12}
            textAnchor="middle"
            fill={t.muted}
            fontSize={size === 'l' ? 11 : 9}
            fontFamily={t.font}
          >
            {analysis?.label ?? '—'}
          </text>
        </svg>
      </div>

      <div style={{ textAlign: 'center', color: t.faint, fontSize: sc.font - 2 }}>{analysis?.detail ?? '—'}</div>

      <div style={{ height: 4, background: t.surface, borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${score}%`,
            background: color,
            borderRadius: 99,
            transition: 'width 0.5s ease, background 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}
