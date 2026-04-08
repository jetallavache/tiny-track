/**
 * MetricRow — a single labelled metric row with ASCII bar and value.
 * Used inside MetricsPanel.
 */
import { themeStyles } from '../../theme.js';

export function MetricRow({
  label, value, barStr, color, s, fontSize, labelWidth = 36, tooltip,
}: {
  label: string;
  value: string;
  barStr: string | null;
  color: string;
  s: ReturnType<typeof themeStyles>;
  fontSize: number;
  labelWidth?: number;
  tooltip?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={tooltip}>
      <span style={{ ...s.label, minWidth: labelWidth, fontSize: fontSize - 2 }}>{label}</span>
      <span style={{ color, letterSpacing: 1, minWidth: 72, fontFamily: '"JetBrains Mono","Fira Code",monospace' }}>
        {barStr ?? '        '}
      </span>
      <span style={{ ...s.numval, color }}>{value}</span>
    </div>
  );
}
