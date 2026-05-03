# useRawPackets() — Raw Metrics Example

Subscribe to raw metrics without React components. Useful for logging, custom processing, or integration with external systems.

## Plain Text Output

```ts
import { TinyTrackProvider, useRawPackets } from 'tinytsdk/react';

function MetricsLogger() {
  const packets = useRawPackets();

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
      {packets.slice(-20).map((m, i) => (
        <div key={i}>
          {new Date(m.timestamp * 1000).toISOString()} | 
          CPU: {(m.cpu / 100).toFixed(1)}% | 
          MEM: {(m.mem / 100).toFixed(1)}% | 
          LOAD: {(m.load1 / 100).toFixed(2)}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <TinyTrackProvider url="ws://localhost:25015">
      <MetricsLogger />
    </TinyTrackProvider>
  );
}
```

## CSV Export

```ts
import { useRawPackets } from 'tinytsdk/react';

function ExportCSV() {
  const packets = useRawPackets();

  const handleExport = () => {
    const csv = [
      'timestamp,cpu,mem,disk,load1,netRx,netTx',
      ...packets.map(m => 
        `${m.timestamp},${m.cpu},${m.mem},${m.duUsage},${m.load1},${m.netRx},${m.netTx}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${Date.now()}.csv`;
    a.click();
  };

  return <button onClick={handleExport}>Export CSV</button>;
}
```

## Send to External Service

```ts
import { useRawPackets, useTinyTrack } from 'tinytsdk/react';
import { useEffect } from 'react';

function MetricsUploader() {
  const packets = useRawPackets();
  const { connected } = useTinyTrack();

  useEffect(() => {
    if (!connected || packets.length === 0) return;

    const latest = packets[packets.length - 1];
    
    // Send to your backend
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: latest.timestamp,
        cpu: latest.cpu / 100,
        mem: latest.mem / 100,
        disk: latest.duUsage / 100,
      })
    }).catch(err => console.error('Upload failed:', err));
  }, [packets, connected]);

  return <div>Uploading metrics...</div>;
}
```
