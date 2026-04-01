import { TinyTrackProvider, Dashboard, TimeSeriesChart } from 'tinytsdk/react';
import { RING_L1, RING_L2 } from 'tinytsdk';

const WS_URL = `ws://${window.location.host}`;

export default function App() {
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 16, fontWeight: 600, color: '#f3f4f6', margin: 0 }}>
        TinyTrack — System Monitor
      </h1>

      <TinyTrackProvider url={WS_URL}>
        {/* Dashboard panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <p style={labelStyle}>compact</p>
            <Dashboard mode="compact" />
          </div>
          <div>
            <p style={labelStyle}>expanded</p>
            <Dashboard mode="expanded" historySize={60} />
          </div>
        </div>

        {/* Time-series charts */}
        <p style={labelStyle}>time-series (L1 — last hour)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TimeSeriesChart metric="cpu"  level={RING_L1} height={120} />
          <TimeSeriesChart metric="mem"  level={RING_L1} height={120} />
          <TimeSeriesChart metric="load" level={RING_L1} height={120} />
          <TimeSeriesChart metric="net"  level={RING_L1} height={120} />
        </div>

        <p style={labelStyle}>disk (L2 — 24h)</p>
        <TimeSeriesChart metric="disk" level={RING_L2} height={100} maxSamples={120} />
      </TinyTrackProvider>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#6b7280',
  margin: '0 0 4px',
  fontFamily: 'monospace',
};
