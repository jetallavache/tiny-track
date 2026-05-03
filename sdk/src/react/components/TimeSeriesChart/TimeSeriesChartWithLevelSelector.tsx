import { useState, CSSProperties } from 'react';
import { TimeSeriesChart, TimeSeriesChartProps } from './index.js';
import { useTheme } from '../../theme.js';
import { RING_L1, RING_L2, RING_L3 } from '../../../proto.js';

export interface TimeSeriesChartWithLevelSelectorProps extends Omit<TimeSeriesChartProps, 'level'> {
  defaultLevel?: number;
  onLevelChange?: (level: number) => void;
}

const LEVELS = [
  { value: RING_L1, label: 'L1 (1s/1h)' },
  { value: RING_L2, label: 'L2 (1m/24h)' },
  { value: RING_L3, label: 'L3 (1h/30d)' },
];

export function TimeSeriesChartWithLevelSelector({
  defaultLevel = RING_L1,
  onLevelChange,
  ...props
}: TimeSeriesChartWithLevelSelectorProps) {
  const [level, setLevel] = useState(defaultLevel);
  const { theme: t } = useTheme();

  const handleLevelChange = (newLevel: number) => {
    setLevel(newLevel);
    onLevelChange?.(newLevel);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12, color: t.muted, fontFamily: t.font }}>Buffer Level:</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {LEVELS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleLevelChange(value)}
              style={{
                padding: '4px 8px',
                background: level === value ? t.cpu : t.btnBg,
                color: level === value ? '#fff' : t.text,
                border: `1px solid ${level === value ? t.cpu : t.border}`,
                borderRadius: t.radius,
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: t.font,
                transition: t.transition,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <TimeSeriesChart {...props} level={level} />
    </div>
  );
}
