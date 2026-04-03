import { TinyTrackProvider, Dashboard, TimeSeriesChart, MetricsBar } from 'tinytsdk/react';
import { RING_L1, RING_L2 } from 'tinytsdk';

// const WS_URL = `ws://${window.location.host}`;
const WS_URL = 'ws://localhost:27017';

export default function App() {
  return (
    <TinyTrackProvider url={WS_URL}>
      {/* Header bar — MetricsBar example */}
      <header style={headerStyle}>
        <span style={{ color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>TinyTrack</span>
        <MetricsBar />
      </header>

      {/* Main content */}
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: '#f3f4f6', margin: 0 }}>System Monitor</h1>

        {/* Dashboard panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <p style={labelStyle}>compact</p>
            <Dashboard mode="compact" />
          </div>
          {/* <div>
            <p style={labelStyle}>expanded</p>
            <Dashboard mode="expanded" historySize={60} />
          </div> */}
        </div>

        {/* Time-series charts */}
        {/* <p style={labelStyle}>time-series (L1 — last hour)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TimeSeriesChart metric="cpu"  level={RING_L1} height={120} />
          <TimeSeriesChart metric="mem"  level={RING_L1} height={120} />
          <TimeSeriesChart metric="load" level={RING_L1} height={120} />
          <TimeSeriesChart metric="net"  level={RING_L1} height={120} />
        </div>

        <p style={labelStyle}>disk (L2 — 24h)</p>
        <TimeSeriesChart metric="disk" level={RING_L2} height={100} maxSamples={120} /> */}

        {/* Footer bar example */}
        {/* <footer style={footerStyle}>
          <MetricsBar showDisk={false} />
        </footer> */}
      </div>
    </TinyTrackProvider>
  );
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 24px',
  background: '#0d1117',
  borderBottom: '1px solid #1f2937',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: '8px 0',
  borderTop: '1px solid #1f2937',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#6b7280',
  margin: '0 0 4px',
  fontFamily: 'monospace',
};
