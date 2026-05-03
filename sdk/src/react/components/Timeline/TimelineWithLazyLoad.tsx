import { useState, useCallback, CSSProperties } from 'react';
import { Timeline, TimelineProps } from './index.js';
import { useTheme } from '../../theme.js';
import { useTinyTrack } from '../../TinyTrackProvider.js';
import { RING_L1, RING_L2, RING_L3 } from '../../../proto.js';

export interface TimelineWithLazyLoadProps extends TimelineProps {
  onLoadMore?: (level: number, startTs: number, endTs: number) => void;
}

export function TimelineWithLazyLoad({ onLoadMore, ...props }: TimelineWithLazyLoadProps) {
  const [loading, setLoading] = useState(false);
  const { theme: t } = useTheme();
  const { client } = useTinyTrack();

  const handleLoadMore = useCallback(
    (level: number, startTs: number, endTs: number) => {
      if (loading || !client) return;

      setLoading(true);
      client.getHistory(level, 100, startTs, endTs);

      setTimeout(() => setLoading(false), 1000);
      onLoadMore?.(level, startTs, endTs);
    },
    [client, loading, onLoadMore],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {loading && (
        <div
          style={{
            padding: 8,
            background: t.surface,
            borderRadius: t.radius,
            border: `1px solid ${t.border}`,
            fontSize: 12,
            color: t.muted,
            fontFamily: t.font,
            textAlign: 'center',
          }}
        >
          Loading more data...
        </div>
      )}

      <Timeline {...props} />

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
        💡 Scroll to load more data from earlier time periods
      </div>
    </div>
  );
}
