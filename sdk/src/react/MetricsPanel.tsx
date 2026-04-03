import { useMetrics } from './TinyTrackProvider.js';

export interface MetricsPanelProps {
  className?: string;
}

export function MetricsPanel({ className }: MetricsPanelProps) {
  const { metrics: m, connected } = useMetrics();

  if (!connected) return <div className={className}>Disconnected</div>;
  if (!m) return <div className={className}>Waiting for data...</div>;

  const cpu = (m.cpu / 100).toFixed(1);
  const mem = (m.mem / 100).toFixed(1);
  const load1 = (m.load1 / 100).toFixed(2);
  const netRx = formatBytes(m.netRx);
  const netTx = formatBytes(m.netTx);

  return (
    <div className={className} style={{ fontFamily: 'monospace', padding: '1rem' }}>
      <div>
        <strong>CPU:</strong> {cpu}%
      </div>
      <div>
        <strong>Memory:</strong> {mem}%
      </div>
      <div>
        <strong>Load (1m):</strong> {load1}
      </div>
      <div>
        <strong>Network RX:</strong> {netRx}/s
      </div>
      <div>
        <strong>Network TX:</strong> {netTx}/s
      </div>
      <div>
        <strong>Processes:</strong> {m.nrRunning} / {m.nrTotal}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}
