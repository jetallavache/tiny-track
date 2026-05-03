/**
 * RawPackets.stories — demonstrates useRawPackets() and TypeScript types.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState, useCallback } from 'react';
import { useRawPackets, useTheme } from '../react/index.js';
import { PKT_METRICS, parseMetrics } from '../index.js';
import type { TtMetrics } from '../index.js';
import { MockTinyTrackProvider } from './MockProvider.js';

/* ── Demo component ─────────────────────────────────────────────────────── */

function RawPacketLog() {
  const t = useTheme();
  const [log, setLog] = useState<string[]>([]);

  const handler = useCallback((pktType: number, payload: DataView) => {
    let line = `[0x${pktType.toString(16).padStart(2, '0')}]`;
    if (pktType === PKT_METRICS) {
      const m: TtMetrics = parseMetrics(payload);
      line += ` PKT_METRICS  cpu=${(m.cpu / 100).toFixed(1)}%  mem=${(m.mem / 100).toFixed(1)}%`;
    } else {
      line += ` payload ${payload.byteLength}B`;
    }
    setLog((prev) => [...prev.slice(-19), line]);
  }, []);

  useRawPackets(handler);

  return (
    <div
      style={{
        fontFamily: '"JetBrains Mono","Fira Code",monospace',
        fontSize: 11,
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: '10px 14px',
        minHeight: 200,
        color: t.text,
      }}
    >
      <div style={{ color: t.muted, marginBottom: 8, fontSize: 10 }}>useRawPackets() — live packet log</div>
      {log.length === 0 ? (
        <span style={{ color: t.faint }}>Waiting for packets…</span>
      ) : (
        log.map((l, i) => (
          <div key={i} style={{ color: i === log.length - 1 ? t.ok : t.muted }}>
            {l}
          </div>
        ))
      )}
    </div>
  );
}

/* ── Story meta ─────────────────────────────────────────────────────────── */

const meta: Meta = {
  title: 'Advanced/RawPackets',
  decorators: [
    (Story) => (
      <MockTinyTrackProvider>
        <div style={{ padding: 16, maxWidth: 560 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

export const LiveLog: Story = {
  name: 'useRawPackets() live log',
  render: () => <RawPacketLog />,
};
