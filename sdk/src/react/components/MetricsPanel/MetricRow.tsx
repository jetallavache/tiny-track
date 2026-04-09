/**
 * MetricRow — a single labelled metric row with ASCII bar and value.
 * Used inside MetricsPanel.
 */
import { TtTheme, themeStyles, invertColor, dimColor } from '../../theme.js';

export function MetricRow({
  label, value, barStr, color, s, t, fontSize, labelWidth = 36, tooltip,
}: {
  label: string;
  value: string;
  barStr: string | null;
  color: string;
  s: ReturnType<typeof themeStyles>;
  t?: TtTheme;
  fontSize: number;
  labelWidth?: number;
  tooltip?: string;
}) {
  const dimmed = t ? dimColor(color, t.bg) : (t as any)?.faint ?? '#4b5563';
  const empty  = t?.faint ?? '#4b5563';

  const barContent = barStr
    ? barStr.split('').map((ch, i) => (
        <span key={i} style={{ color: ch === '█' ? color : dimmed }}>{ch}</span>
      ))
    : <span style={{ color: empty }}>{'        '}</span>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={tooltip}>
      <span style={{ ...s.label, minWidth: labelWidth, fontSize: fontSize - 2 }}>{label}</span>
      <span style={{
        letterSpacing: 1,
        minWidth: 72,
        fontFamily: '"JetBrains Mono","Fira Code",monospace',
        display: 'inline-flex',
      }}>
        {barContent}
      </span>
      <span style={{
        ...s.numval,
        color,
        textShadow: t?.glow ? `0 0 6px ${color}66` : undefined,
      }}>
        {value}
      </span>
    </div>
  );
}
