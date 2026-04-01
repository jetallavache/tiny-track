import { TinyTrackProvider, Dashboard } from 'tinytsdk/react';

// Vite proxy forwards /websocket → ws://localhost:4026/websocket
const WS_URL = `ws://${window.location.host}`;

export default function App() {
  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '40px auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: '#f3f4f6' }}>
        TinyTrack — System Monitor
      </h1>

      <TinyTrackProvider url={WS_URL}>
        <section>
          <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>compact mode</p>
          <Dashboard mode="compact" />
        </section>

        <section>
          <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>expanded mode</p>
          <Dashboard mode="expanded" />
        </section>
      </TinyTrackProvider>
    </div>
  );
}
