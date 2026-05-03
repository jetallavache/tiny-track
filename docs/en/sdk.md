# TinyTrack SDK — tinytsdk

TypeScript SDK for TinyTrack with WebSocket client, React components, and vanilla JS support.

## Installation

### npm (React + TypeScript)

```bash
npm install tinytsdk
```

### CDN (Vanilla JS, no build step)

```html
<script src="https://cdn.jsdelivr.net/npm/tinytsdk/dist/tinytsdk.min.js"></script>
```

## Quick Start

### React / Next.js

```jsx
import { TinyTrackProvider, MetricsBar } from 'tinytsdk/react';

export default function App() {
  return (
    <TinyTrackProvider url="ws://your-host:25015">
      <MetricsBar />
    </TinyTrackProvider>
  );
}
```

### Vanilla JS (CDN)

```html
<script src="https://cdn.jsdelivr.net/npm/tinytsdk/dist/tinytsdk.min.js"></script>
<script>
  const client = new TinyTrack.TinyTrackClient('ws://your-host:25015');
  client.on('metrics', (m) => {
    console.log(`CPU: ${(m.cpu / 100).toFixed(1)}%  RAM: ${(m.mem / 100).toFixed(1)}%`);
  });
  client.connect();
</script>
```

### TypeScript (ESM)

```ts
import { TinyTrackClient } from 'tinytsdk';

const client = new TinyTrackClient('ws://your-host:25015');
client.on('metrics', (m) => {
  console.log(`CPU: ${m.cpu / 100}%  RAM: ${m.mem / 100}%`);
});
await client.connect();
```

## API Reference

### TinyTrackClient

WebSocket client for real-time metrics streaming.

#### Constructor

```ts
new TinyTrackClient(url: string, options?: TinyTrackClientOptions)
```

#### Methods

- `connect(): Promise<void>` — Connect to server
- `disconnect(): Promise<void>` — Disconnect gracefully
- `getSnapshot(): void` — Request current metrics snapshot
- `getStats(): void` — Request ring buffer statistics
- `getSysInfo(): void` — Request system information
- `setInterval(ms: number): void` — Set collection interval
- `start(): void` — Start streaming
- `stop(): void` — Stop streaming
- `getHistory(level: number, count?: number, startTs?: number, endTs?: number): void` — Request historical data
- `subscribe(level: number, count?: number): void` — Subscribe to history updates

#### Events

- `connect` — TCP connection established
- `ready` / `open` — WebSocket handshake complete, streaming active
- `metrics` — New metrics snapshot received
- `config` — Configuration changed
- `stats` — Ring buffer statistics received
- `sysinfo` — System information received
- `history` — Historical data received
- `reconnecting` — Attempting to reconnect
- `disconnect` — Connection closed
- `error` — Error occurred

#### Example

```ts
const client = new TinyTrackClient('ws://localhost:25015');

client.on('ready', () => console.log('Connected'));
client.on('metrics', (m) => {
  console.log(`CPU: ${m.cpu}%, MEM: ${m.mem}%, LOAD: ${m.load1}`);
});
client.on('error', (err) => console.error('Error:', err));

await client.connect();
client.getSnapshot();
```

### React Components

#### TinyTrackProvider

Provides metrics context to child components.

```jsx
<TinyTrackProvider 
  url="ws://your-host:25015"
  token="optional-auth-token"
>
  <YourApp />
</TinyTrackProvider>
```

#### MetricsBar

Compact horizontal bar showing CPU, memory, network, disk.

```jsx
<MetricsBar />
```

#### MetricsPanel

Detailed panel with current metrics and mini-charts.

```jsx
<MetricsPanel />
```

#### Dashboard

Full-featured dashboard with gauges, charts, and controls.

```jsx
<Dashboard mode="expanded" />
```

#### TimeSeriesChart

Line chart for historical metrics over time.

```jsx
<TimeSeriesChart metric="cpu" level={1} />
```

#### Timeline

Interactive timeline with zoom and drill-down.

```jsx
<Timeline />
```

#### SystemLoad

Load average visualization (1m, 5m, 15m).

```jsx
<SystemLoad />
```

#### Metrics3D

3D visualization of system metrics (requires three.js).

```jsx
<Metrics3D />
```

#### DiskMap

Disk usage visualization by partition.

```jsx
<DiskMap />
```

#### Sparkline

Compact inline chart for a single metric.

```jsx
<Sparkline metric="cpu" />
```

### Hooks

#### useMetrics()

Get current metrics snapshot.

```ts
const metrics = useMetrics();
console.log(metrics.cpu, metrics.mem);
```

#### useHistory(level, range)

Get historical metrics for a time range.

```ts
const history = useHistory(1, 3600); // L1, last hour
```

#### useRawPackets()

Subscribe to raw protocol packets.

```ts
const packets = useRawPackets();
packets.forEach(pkt => console.log(pkt));
```

#### useTinyTrack()

Get client instance and connection state.

```ts
const { client, connected } = useTinyTrack();
```

### Theme

#### useTheme()

Access current theme tokens.

```ts
const theme = useTheme();
console.log(theme.colors.primary);
```

#### ThemeProvider

Wrap app with custom theme.

```jsx
import { ThemeProvider, THEMES } from 'tinytsdk/react';

<ThemeProvider preset={THEMES.dark}>
  <App />
</ThemeProvider>
```

## Protocol Constants

```ts
import {
  PROTO_MAGIC,
  PKT_METRICS,
  PKT_CONFIG,
  PKT_ACK,
  RING_L1,
  RING_L2,
  RING_L3,
  CMD_SET_INTERVAL,
  CMD_GET_SNAPSHOT,
  // ... more constants
} from 'tinytsdk';
```

## Bundle Sizes

| Bundle | Size (gzip) | Use case |
|--------|-------------|----------|
| `index.esm.js` | 2.8 KB | Core client only |
| `index.cjs.js` | 2.8 KB | Core client (CommonJS) |
| `react.esm.js` | 23.7 KB | React components |
| `react.cjs.js` | 23.7 KB | React components (CommonJS) |
| `tinytsdk.min.js` | 2.8 KB | CDN (IIFE, core only) |

## Examples

### Log metrics to console

```ts
import { TinyTrackClient } from 'tinytsdk';

const client = new TinyTrackClient('ws://localhost:25015');
client.on('metrics', (m) => {
  console.log(JSON.stringify(m, null, 2));
});
await client.connect();
```

### Export to CSV

```ts
import { TinyTrackClient } from 'tinytsdk';
import * as fs from 'fs';

const client = new TinyTrackClient('ws://localhost:25015');
const stream = fs.createWriteStream('metrics.csv');

stream.write('timestamp,cpu,mem,load1\n');
client.on('metrics', (m) => {
  stream.write(`${m.timestamp},${m.cpu},${m.mem},${m.load1}\n`);
});

await client.connect();
```

### React dashboard with custom styling

```jsx
import { TinyTrackProvider, Dashboard, ThemeProvider } from 'tinytsdk/react';

export default function App() {
  return (
    <ThemeProvider preset="dark">
      <TinyTrackProvider url="ws://localhost:25015">
        <div style={{ padding: '20px' }}>
          <h1>System Metrics</h1>
          <Dashboard mode="expanded" />
        </div>
      </TinyTrackProvider>
    </ThemeProvider>
  );
}
```

## Troubleshooting

### Connection refused

- Ensure tinytrack server is running on the specified host:port
- Check firewall rules allow WebSocket connections
- Verify URL format: `ws://host:port` (not `http://`)

### Metrics not updating

- Check browser console for errors
- Verify server is streaming metrics (check `tiny-cli metrics`)
- Ensure client is connected: `client.connected === true`

### Bundle size too large

- Use `tinytsdk-lite` for core client only (no React)
- Tree-shake unused components in your bundler
- Use dynamic imports for heavy components like Metrics3D

## See Also

- [Server documentation](./overview.md)
- [Architecture](./architecture.md)
- [GitHub repository](https://github.com/jetallavache/tinytrack)
