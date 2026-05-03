import { useState, useCallback, CSSProperties } from 'react';
import { TimeSeriesChart, TimeSeriesChartProps } from './index.js';
import { useTheme } from '../../theme.js';
import { RING_L1, RING_L2, RING_L3 } from '../../../proto.js';

export interface TimeSeriesChartWithAutoLevelProps extends Omit<TimeSeriesChartProps, 'level'> {
  /** Time range in seconds. Auto-selects level based on range. */
  timeRange?: number;
  onLevelChange?: (level: number) => void;
}

/**
 * Auto-select ring buffer level based on time range:
 * - < 1h (3600s) → L1 (1s resolution)
 * - < 24h (86400s) → L2 (1min resolution)
 * - >= 24h → L3 (1h resolution)
 */
function getAutoLevel(timeRangeSeconds?: number): number {
  if (!timeRangeSeconds) return RING_L1;
  if (timeRangeSeconds < 3600) return RING_L1;
  if (timeRangeSeconds < 86400) return RING_L2;
  return RING_L3;
}

export function TimeSeriesChartWithAutoLevel({
  timeRange,
  onLevelChange,
  ...props
}: TimeSeriesChartWithAutoLevelProps) {
  const [level, setLevel] = useState(() => getAutoLevel(timeRange));
  const { theme: t } = useTheme();

  const handleTimeRangeChange = useCallback(
    (newRange: number) => {
      const newLevel = getAutoLevel(newRange);
      if (newLevel !== level) {
        setLevel(newLevel);
        onLevelChange?.(newLevel);
      }
    },
    [level, onLevelChange],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        📊 Auto-selected level: {level === RING_L1 ? 'L1 (1s)' : level === RING_L2 ? 'L2 (1min)' : 'L3 (1h)'}
      </div>

      <TimeSeriesChart {...props} level={level} />
    </div>
  );
}
