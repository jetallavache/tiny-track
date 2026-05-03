# tinytsdk-lite

Minimal WebSocket client for TinyTrack. Core client only, no React, no three.js.

**Size**: 2.7 KB gzip | **No dependencies** | **TypeScript**

## Installation

```bash
npm install tinytsdk-lite
```

## Quick Start

```ts
import { TinyTrackClient } from 'tinytsdk-lite';

const client = new TinyTrackClient('ws://your-host:25015');
client.on('metrics', (m) => {
  console.log(`CPU: ${m.cpu}%, MEM: ${m.mem}%`);
});
await client.connect();
```

## API

### TinyTrackClient

- `connect(): Promise<void>` — Connect to server
- `disconnect(): Promise<void>` — Disconnect gracefully
- `getSnapshot(): void` — Request current metrics
- `getStats(): void` — Request ring buffer stats
- `getSysInfo(): void` — Request system info
- `setInterval(ms: number): void` — Set collection interval
- `start(): void` — Start streaming
- `stop(): void` — Stop streaming
- `getHistory(level, count?, startTs?, endTs?): void` — Request historical data

### Events

- `connect` — TCP connection established
- `ready` / `open` — WebSocket handshake complete
- `metrics` — New metrics received
- `config` — Configuration changed
- `stats` — Ring buffer stats received
- `sysinfo` — System info received
- `history` — Historical data received
- `reconnecting` — Attempting to reconnect
- `disconnect` — Connection closed
- `error` — Error occurred

## When to Use

- **tinytsdk-lite**: Minimal client, no UI framework needed
- **tinytsdk**: Full SDK with React components and three.js visualization

## See Also

- [tinytsdk](https://www.npmjs.com/package/tinytsdk) — Full SDK with React
- [TinyTrack](https://github.com/jetallavache/tinytrack) — Server & CLI
