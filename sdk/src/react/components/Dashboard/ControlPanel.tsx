import { CSSProperties } from 'react';
import { useTheme } from '../../theme.js';
import { useTinyTrack } from '../../TinyTrackProvider.js';

export interface ControlPanelProps {
  streaming?: boolean;
  onStreamingChange?: (streaming: boolean) => void;
  interval?: number;
  onIntervalChange?: (interval: number) => void;
  aggregation?: 'avg' | 'min' | 'max';
  onAggregationChange?: (agg: 'avg' | 'min' | 'max') => void;
  style?: CSSProperties;
}

const INTERVALS = [1000, 2000, 5000, 10000, 30000];
const INTERVAL_LABELS = ['1s', '2s', '5s', '10s', '30s'];

export function ControlPanel({
  streaming = true,
  onStreamingChange,
  interval = 1000,
  onIntervalChange,
  aggregation = 'avg',
  onAggregationChange,
  style,
}: ControlPanelProps) {
  const { theme: t } = useTheme();
  const { client } = useTinyTrack();

  const handleStreamingToggle = () => {
    const next = !streaming;
    if (client) {
      next ? client.start() : client.stop();
    }
    onStreamingChange?.(next);
  };

  const handleIntervalChange = (ms: number) => {
    if (client) {
      client.setInterval(ms);
    }
    onIntervalChange?.(ms);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: 12,
        background: t.surface,
        borderRadius: t.radius,
        border: `1px solid ${t.border}`,
        alignItems: 'center',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {/* Start/Stop */}
      <button
        onClick={handleStreamingToggle}
        style={{
          padding: '6px 12px',
          background: streaming ? t.cpu : t.btnBg,
          color: streaming ? '#fff' : t.text,
          border: `1px solid ${streaming ? t.cpu : t.border}`,
          borderRadius: t.radius,
          cursor: 'pointer',
          fontSize: 12,
          fontFamily: t.font,
          transition: t.transition,
        }}
      >
        {streaming ? '⏸ Stop' : '▶ Start'}
      </button>

      {/* Interval selector */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <label style={{ fontSize: 11, color: t.muted, fontFamily: t.font }}>Interval:</label>
        <select
          value={interval}
          onChange={(e) => handleIntervalChange(Number(e.target.value))}
          style={{
            padding: '4px 8px',
            background: t.btnBg,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            fontSize: 11,
            fontFamily: t.font,
            cursor: 'pointer',
          }}
        >
          {INTERVALS.map((ms, i) => (
            <option key={ms} value={ms}>
              {INTERVAL_LABELS[i]}
            </option>
          ))}
        </select>
      </div>

      {/* Aggregation selector */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <label style={{ fontSize: 11, color: t.muted, fontFamily: t.font }}>Agg:</label>
        <select
          value={aggregation}
          onChange={(e) => onAggregationChange?.(e.target.value as 'avg' | 'min' | 'max')}
          style={{
            padding: '4px 8px',
            background: t.btnBg,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            fontSize: 11,
            fontFamily: t.font,
            cursor: 'pointer',
          }}
        >
          <option value="avg">avg</option>
          <option value="min">min</option>
          <option value="max">max</option>
        </select>
      </div>
    </div>
  );
}
