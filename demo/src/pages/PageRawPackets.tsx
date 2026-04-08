/**
 * PageRawPackets — документация useRawPackets и TypeScript типов SDK.
 */
import { useTheme } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, Divider } from '../components.js';

export function PageRawPackets() {
  const t = useTheme();
  return (
    <div>
      <PageTitle
        title="Raw Packets & TypeScript"
        badge="advanced"
        desc="Low-level access to the binary WebSocket protocol. Use useRawPackets() to receive every incoming packet before it is parsed, and import SDK types for full TypeScript coverage."
      />

      <PageSection title="useRawPackets()">
        <p style={{ fontSize: 13, color: t.muted, fontFamily: t.font, lineHeight: 1.7, marginBottom: 12 }}>
          Subscribe to raw incoming packets without any React component wrappers.
          Useful when you want to feed data into your own state manager (Redux, Zustand, etc.)
          or implement custom protocol handling.
        </p>
        <CodeBlock
          code={`import { TinyTrackProvider, useRawPackets } from 'tinytsdk/react';
import { PKT_METRICS, parseMetrics } from 'tinytsdk';
import type { TtMetrics } from 'tinytsdk';

function RawConsumer() {
  useRawPackets((pktType: number, payload: DataView) => {
    if (pktType === PKT_METRICS) {
      const m: TtMetrics = parseMetrics(payload);
      console.log('cpu:', m.cpu / 100, '%');
    }
  });
  return null;
}

// Wrap in TinyTrackProvider as usual
export function App() {
  return (
    <TinyTrackProvider url="ws://localhost:25015">
      <RawConsumer />
    </TinyTrackProvider>
  );
}`}
        />
      </PageSection>

      <Divider />

      <PageSection title="ClientEventMap.packet">
        <p style={{ fontSize: 13, color: t.muted, fontFamily: t.font, lineHeight: 1.7, marginBottom: 12 }}>
          The underlying <code style={{ fontFamily: 'monospace', color: t.cpu }}>TinyTrackClient</code> emits
          a <code style={{ fontFamily: 'monospace', color: t.cpu }}>packet</code> event before any parsing occurs.
          Use this when working without React.
        </p>
        <CodeBlock
          code={`import { TinyTrackClient } from 'tinytsdk';
import type { ClientEventMap } from 'tinytsdk';

const client = new TinyTrackClient('ws://localhost:25015');

// Typed handler — pktType is number, payload is DataView
client.on('packet', (pktType: number, payload: DataView) => {
  console.log('raw packet type:', pktType.toString(16));
});

client.connect();`}
        />
      </PageSection>

      <Divider />

      <PageSection title="TypeScript types">
        <p style={{ fontSize: 13, color: t.muted, fontFamily: t.font, lineHeight: 1.7, marginBottom: 12 }}>
          All SDK types are exported from <code style={{ fontFamily: 'monospace', color: t.cpu }}>tinytsdk</code> (core)
          and <code style={{ fontFamily: 'monospace', color: t.cpu }}>tinytsdk/react</code> (components).
        </p>
        <CodeBlock
          code={`/* Core types — import from 'tinytsdk' */
import type {
  TtMetrics,       // parsed metrics sample
  TtConfig,        // server config (interval)
  TtAck,           // command acknowledgement
  TtStats,         // ring buffer statistics
  TtHistoryResp,   // history batch response
  TtSysInfo,       // system info (hostname, uptime, slots)
  TtFrame,         // raw parsed frame header
  TtRingStat,      // single ring level stats
  TinyTrackClientOptions,
  ClientEventMap,  // all client events including 'packet'
} from 'tinytsdk';

/* React component types — import from 'tinytsdk/react' */
import type {
  MetricType,       // 'cpu' | 'mem' | 'net' | 'disk' | 'load'
  AggregationType,  // 'avg' | 'max' | 'min'
  SizeType,         // 's' | 'm' | 'l'
  Alert,            // { id, label, level }
  LoadTrend,        // 'rising' | 'falling' | 'stable'
  TtTheme,          // full theme token interface
  ThemePreset,      // 'terminal' | 'dark' | 'light' | ...
  MetricsBarProps,
  MetricsPanelProps,
  DashboardProps,
  TimeSeriesChartProps,
  TimelineProps,
  SystemLoadProps,
  Metrics3DProps,
  SparklineProps,
} from 'tinytsdk/react';`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Protocol constants">
        <CodeBlock
          code={`import {
  /* Packet types */
  PKT_METRICS, PKT_CONFIG, PKT_ACK,
  PKT_RING_STATS, PKT_HISTORY_RESP, PKT_SYS_INFO,
  /* Commands */
  CMD_SET_INTERVAL, CMD_GET_SNAPSHOT,
  CMD_GET_SYS_INFO, CMD_START, CMD_STOP,
  /* Ring levels */
  RING_L1, RING_L2, RING_L3,
  /* ACK status */
  ACK_OK, ACK_ERROR,
  /* Parsers */
  parseMetrics, parseConfig, parseAck,
  parseStats, parseHistoryResp, parseSysInfo,
} from 'tinytsdk';`}
        />
      </PageSection>
    </div>
  );
}
