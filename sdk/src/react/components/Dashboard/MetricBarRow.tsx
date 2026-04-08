/**
 * MetricBarRow — a single metric row with ASCII bar, used inside Dashboard.
 */
import { TtTheme, themeStyles } from '../../theme.js';
import { fmtPct, bar } from '../../utils/format.js';

export function MetricBarRow({
  label, value, color, t, fontSize,
}: {
  label: string;
  value: number;
  color: string;
  t: TtTheme;
  fontSize: number;
}) {
  const s = themeStyles(t);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 180 }}>
      <span style={{ ...s.label, minWidth: 28, fontSize: fontSize - 2 }}>{label}</span>
      <span style={{ color, letterSpacing: 1, minWidth: 72, fontFamily: '"JetBrains Mono","Fira Code",monospace' }}>
        {bar(value)}
      </span>
      <span style={{ ...s.numval, color, minWidth: 48 }}>{fmtPct(value)}</span>
    </div>
  );
}

/**
 * SparkBlock — labelled sparkline used in Dashboard expanded mode.
 */
import { Sparkline } from '../Sparkline/index.js';

export function SparkBlock({
  label, data, max, color, h = 28,
}: {
  label: string;
  data: number[];
  max?: number;
  color: string;
  h?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      <span style={{ fontSize: 10, color: '#9ca3af' }}>{label}</span>
      <Sparkline data={data} max={max} color={color} fill={color + '22'} width={100} height={h} />
    </div>
  );
}
