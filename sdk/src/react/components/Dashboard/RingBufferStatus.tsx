import { CSSProperties } from 'react';
import { useTheme } from '../../theme.js';
import { TtRingStat } from '../../../proto.js';

export interface RingBufferStatusProps {
  stats?: { l1?: TtRingStat; l2?: TtRingStat; l3?: TtRingStat };
  style?: CSSProperties;
}

export function RingBufferStatus({ stats, style }: RingBufferStatusProps) {
  const { theme: t } = useTheme();

  const renderBuffer = (label: string, stat?: TtRingStat, color?: string) => {
    if (!stat) return null;
    const pct = stat.capacity > 0 ? (stat.filled / stat.capacity) * 100 : 0;
    return (
      <div key={label} style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: t.muted, marginBottom: 4, fontFamily: t.font }}>
          {label} ({stat.filled}/{stat.capacity})
        </div>
        <div
          style={{
            height: 6,
            background: t.btnBg,
            borderRadius: 2,
            overflow: 'hidden',
            border: `1px solid ${t.border}`,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: color || t.cpu,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: 12,
        background: t.surface,
        borderRadius: t.radius,
        border: `1px solid ${t.border}`,
        ...style,
      }}
    >
      {renderBuffer('L1 (1s/1h)', stats?.l1, t.cpu)}
      {renderBuffer('L2 (1m/24h)', stats?.l2, t.mem)}
      {renderBuffer('L3 (1h/30d)', stats?.l3, t.disk)}
    </div>
  );
}
