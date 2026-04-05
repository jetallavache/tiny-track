import { useTheme } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, Divider } from '../components.js';

export function Installation() {
  const t = useTheme();
  return (
    <div>
      <PageTitle
        title="Installation"
        desc="Add TinyTrack SDK to your project and connect to a running TinyTrack gateway."
      />

      <PageSection title="Requirements">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['Node.js', '≥ 18'],
            ['React', '≥ 18 (optional, for React components)'],
            ['TinyTrack gateway', 'running on your server'],
          ].map(([name, ver]) => (
            <div
              key={name}
              style={{
                display: 'flex',
                gap: 12,
                padding: '6px 12px',
                background: t.surface,
                borderRadius: t.radius,
                border: `1px solid ${t.divider}`,
              }}
            >
              <span style={{ fontSize: 12, color: t.text, fontFamily: t.font, minWidth: 180 }}>{name}</span>
              <span style={{ fontSize: 12, color: t.muted, fontFamily: t.font }}>{ver}</span>
            </div>
          ))}
        </div>
      </PageSection>

      <Divider />

      <PageSection title="Install package">
        <CodeBlock code={`npm install tinytsdk`} />
        <p style={{ fontSize: 12, color: t.muted, fontFamily: t.font, marginTop: 8 }}>
          Or link locally from the monorepo:
        </p>
        <CodeBlock
          code={`# in your project
npm install ../path/to/tiny-track/sdk`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Start the server">
        <p style={{ fontSize: 13, color: t.muted, fontFamily: t.font, lineHeight: 1.7, marginBottom: 12 }}>
          The SDK connects to a running TinyTrack gateway. Start it with Docker or install natively:
        </p>
        <CodeBlock
          code={`# Docker (recommended)
docker compose up -d

# Native
./bootstrap.sh && ./configure && make
sudo make install
sudo systemctl start tinytd tinytrack`}
        />
        <p style={{ fontSize: 12, color: t.muted, fontFamily: t.font, marginTop: 8 }}>
          Gateway listens on{' '}
          <code style={{ fontFamily: 'monospace', color: t.cpu }}>ws://localhost:25015/websocket</code> by default.
        </p>
      </PageSection>

      <Divider />

      <PageSection title="Basic usage (React)">
        <CodeBlock
          code={`import { TinyTrackProvider, Dashboard } from 'tinytsdk/react';

export default function App() {
  return (
    <TinyTrackProvider url="ws://localhost:25015">
      <Dashboard />
    </TinyTrackProvider>
  );
}`}
        />
      </PageSection>

      <PageSection title="Basic usage (Vanilla JS)">
        <CodeBlock
          code={`import { TinyTrackClient } from 'tinytsdk';

const client = new TinyTrackClient('ws://localhost:25015');

client.on('metrics', m => {
  console.log('CPU:', m.cpu / 100, '%');
  console.log('Mem:', m.mem / 100, '%');
});

client.on('sysinfo', info => {
  console.log('Host:', info.hostname);
});

client.connect();`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Vite proxy (dev)">
        <p style={{ fontSize: 13, color: t.muted, fontFamily: t.font, lineHeight: 1.7, marginBottom: 12 }}>
          In development, proxy WebSocket requests to avoid CORS issues:
        </p>
        <CodeBlock
          code={`// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/websocket': { target: 'ws://localhost:25015', ws: true },
    },
  },
});`}
        />
        <p style={{ fontSize: 12, color: t.muted, fontFamily: t.font, marginTop: 8 }}>
          Then use <code style={{ fontFamily: 'monospace', color: t.cpu }}>{`ws://${window.location.host}`}</code> as
          the URL.
        </p>
      </PageSection>
    </div>
  );
}
