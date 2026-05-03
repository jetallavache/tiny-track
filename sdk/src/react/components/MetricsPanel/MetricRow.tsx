/**
 * MetricRow — a single labelled metric row with ASCII bar and value.
 * Used inside MetricsPanel.
 */
import React from 'react';
import { TtTheme, themeStyles, invertColor, dimColor } from '../../theme.js';

export type BarType = 'ascii' | 'normal';

export function MetricRow({
  label,
  value,
  barStr,
  barType,
  color,
  s,
  t,
  fontSize,
  labelWidth = 36,
  tooltip,
}: {
  label: string;
  value: string;
  barStr: string | null;
  barType: BarType;
  color: string;
  s: ReturnType<typeof themeStyles>;
  t?: TtTheme;
  fontSize: number;
  labelWidth?: number;
  tooltip?: string;
}) {
  const dimmed = t ? dimColor(color, t.bg) : ((t as any)?.faint ?? '#4b5563');
  const empty = t?.faint ?? '#4b5563';
  const pct = Number(value.replace('%', ''));

  const barColor = pct >= 90 ? t?.crit : pct >= 70 ? t?.warn : t?.ok;

  const barContent = barStr ? (
    barStr.split('').map((ch, i) => (
      <span key={i} style={{ color: ch === '█' ? color : dimmed }}>
        {ch}
      </span>
    ))
  ) : (
    <span style={{ color: empty }}>{'        '}</span>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={tooltip}>
      <span style={{ ...s.label, minWidth: labelWidth, fontSize: fontSize - 2 }}>{label}</span>
      {barType == 'ascii' ? (
        <span
          style={{
            letterSpacing: 1,
            minWidth: 72,
            fontFamily: '"JetBrains Mono","Fira Code",monospace',
            display: 'inline-flex',
          }}
        >
          {barContent}
        </span>
      ) : (
        barStr && (
          <div
            style={{
              flex: 1,
              height: '6px',
              width: '60px',
              borderRadius: '9999px',
              backgroundColor: t?.bgAlt,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                zIndex: 9999,
                borderRadius: '9999px',
                transition: 'all 0.7s ease-out',
                width: `${value}`,
                backgroundColor: barColor,
              }}
            />
          </div>
        )
      )}
      <span
        style={{
          ...s.numval,
          color,
          textShadow: t?.glow ? `0 0 6px ${color}66` : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}
