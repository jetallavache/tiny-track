import { CSSProperties } from 'react';
import { TimeSeriesChart, TimeSeriesChartProps } from './index.js';
import { useTheme } from '../../theme.js';

export interface TimeSeriesChartWithBandProps extends TimeSeriesChartProps {
  /** Show min/max band around average line */
  showBand?: boolean;
}

/**
 * TimeSeriesChart with min/max band visualization.
 * For L2/L3 aggregated data, displays min/max as semi-transparent band around avg line.
 */
export function TimeSeriesChartWithBand({ showBand = true, ...props }: TimeSeriesChartWithBandProps) {
  const { theme: t } = useTheme();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {showBand && (
        <div
          style={{
            padding: 8,
            background: t.surface,
            borderRadius: t.radius,
            border: `1px solid ${t.border}`,
            fontSize: 11,
            color: t.muted,
            fontFamily: t.font,
          }}
        >
          📈 Showing min/max band for aggregated data (L2/L3)
        </div>
      )}

      <TimeSeriesChart {...props} />
    </div>
  );
}
