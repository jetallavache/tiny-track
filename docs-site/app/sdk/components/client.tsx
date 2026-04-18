'use client';

import { LiveExample } from '@/components/live-example';

/* ---------------------------------------------------------------------------
 * Vanilla JS snippets for each component
 * These show how to achieve the same result without React
 * ------------------------------------------------------------------------- */

const vanillaSetup = `<!-- 1. Include the bundle -->
<script src="https://cdn.jsdelivr.net/npm/tinytsdk/dist/tinytsdk.min.js"></script>

<!-- 2. Connect once, share the client -->
<script>
  window.__tt = new TinyTrack.TinyTrackClient('ws://your-host:25015');
  window.__tt.connect();
</script>`;

const metricsBarVanilla = `<!-- MetricsBar equivalent: a single status line -->
<div id="tt-bar" style="font-family:monospace;font-size:13px;display:flex;gap:16px;padding:8px 12px;background:#111;border-radius:8px">
  <span>CPU <b id="tt-cpu">—</b></span>
  <span>RAM <b id="tt-mem">—</b></span>
  <span>Disk <b id="tt-disk">—</b></span>
  <span>↓ <b id="tt-rx">—</b> ↑ <b id="tt-tx">—</b></span>
</div>

<script>
  window.__tt.on('metrics', (m) => {
    document.getElementById('tt-cpu').textContent  = (m.cpu  / 100).toFixed(1) + '%';
    document.getElementById('tt-mem').textContent  = (m.mem  / 100).toFixed(1) + '%';
    document.getElementById('tt-disk').textContent = (m.disk / 100).toFixed(1) + '%';
    document.getElementById('tt-rx').textContent   = (m.net_rx / 1024).toFixed(1) + ' KB/s';
    document.getElementById('tt-tx').textContent   = (m.net_tx / 1024).toFixed(1) + ' KB/s';
  });
</script>`;

const metricsPanelVanilla = `<!-- MetricsPanel equivalent: vertical card with bars -->
<div id="tt-panel" style="font-family:monospace;font-size:12px;background:#111;border-radius:8px;padding:16px;width:240px">
  <div class="tt-row">CPU  <progress id="tt-p-cpu"  max="100" value="0"></progress> <span id="tt-v-cpu">—</span></div>
  <div class="tt-row">RAM  <progress id="tt-p-mem"  max="100" value="0"></progress> <span id="tt-v-mem">—</span></div>
  <div class="tt-row">Disk <progress id="tt-p-disk" max="100" value="0"></progress> <span id="tt-v-disk">—</span></div>
</div>

<script>
  window.__tt.on('metrics', (m) => {
    const set = (id, val) => {
      document.getElementById('tt-p-' + id).value       = val;
      document.getElementById('tt-v-' + id).textContent = val.toFixed(1) + '%';
    };
    set('cpu',  m.cpu  / 100);
    set('mem',  m.mem  / 100);
    set('disk', m.disk / 100);
  });
</script>`;

const timeSeriesVanilla = `<!-- TimeSeriesChart equivalent: canvas sparkline -->
<canvas id="tt-chart" width="400" height="80" style="background:#111;border-radius:8px"></canvas>

<script>
  const canvas = document.getElementById('tt-chart');
  const ctx    = canvas.getContext('2d');
  const history = [];
  const MAX = 60;

  window.__tt.on('metrics', (m) => {
    history.push(m.cpu / 100);
    if (history.length > MAX) history.shift();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;

    history.forEach((v, i) => {
      const x = (i / (MAX - 1)) * canvas.width;
      const y = canvas.height - (v / 100) * canvas.height;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
</script>`;

/* ---------------------------------------------------------------------------
 * React snippets
 * ------------------------------------------------------------------------- */

const metricsBarReact = `import { MetricsBar } from 'tinytsdk/react';

// Inside TinyTrackProvider:
<MetricsBar size="m" />

// With system info badges:
<MetricsBar
  size="l"
  sysInfo={['hostname', 'uptime', 'os-type']}
  style={{ width: '100%' }}
/>`;

const metricsPanelReact = `import { MetricsPanel } from 'tinytsdk/react';

// Default (size="m"):
<MetricsPanel />

// Two-column full detail:
<MetricsPanel
  columns={2}
  size="l"
  metrics={['cpu', 'mem', 'net', 'disk', 'load']}
/>

// Custom theme:
<MetricsPanel
  theme={{ bg: '#0d1117', cpu: '#f97316', mem: '#a78bfa' }}
  size="m"
/>`;

const timeSeriesReact = `import { TimeSeriesChart } from 'tinytsdk/react';

// CPU last hour (L1):
<TimeSeriesChart metric="cpu" level="l1" />

// Memory last 24h (L2) with band:
<TimeSeriesChart metric="mem" level="l2" showBand />`;

/* ---------------------------------------------------------------------------
 * Fake preview components (no real WS needed)
 * ------------------------------------------------------------------------- */

function FakeBar() {
  return (
    <div className="flex gap-4 items-center px-3 py-2 rounded-lg bg-muted/50 font-mono text-xs">
      <span>CPU <b className="text-emerald-400">23.4%</b></span>
      <span>RAM <b className="text-blue-400">41.2%</b></span>
      <span>Disk <b className="text-yellow-400">58.0%</b></span>
      <span>↓ <b className="text-muted-foreground">12.1 KB/s</b></span>
      <span>↑ <b className="text-muted-foreground">3.8 KB/s</b></span>
    </div>
  );
}

function FakePanel() {
  const rows = [
    { label: 'CPU', value: 23, color: 'bg-emerald-500' },
    { label: 'RAM', value: 41, color: 'bg-blue-500' },
    { label: 'Disk', value: 58, color: 'bg-yellow-500' },
  ];
  return (
    <div className="w-56 rounded-lg bg-muted/50 p-4 font-mono text-xs space-y-3">
      {rows.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-8 text-muted-foreground">{label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
          </div>
          <span className="w-10 text-right">{value}%</span>
        </div>
      ))}
    </div>
  );
}

function FakeChart() {
  /* Simple SVG sparkline */
  const points = [20, 25, 23, 30, 28, 35, 32, 38, 34, 40, 36, 42, 38, 35, 33];
  const w = 320, h = 60, pad = 4;
  const max = Math.max(...points);
  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v / max) * (h - pad * 2));
    return `${x},${y}`;
  });
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground font-mono mb-2">CPU — last hour (L1)</p>
      <svg width={w} height={h} className="overflow-visible">
        <polyline points={coords.join(' ')} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

export function ComponentsPageClient() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Components</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Every example shows a live preview, the React snippet, and the equivalent Vanilla JS implementation.
        See <a href="/sdk/getting-started" className="text-primary hover:underline">Getting Started</a> to set up your project first.
      </p>

      {/* MetricsBar */}
      <h2 className="text-lg font-semibold mb-1">MetricsBar</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Compact single-line status bar. All metrics in one row.
      </p>
      <LiveExample
        title="Default (size=&quot;m&quot;)"
        description="Abbreviated labels, all metrics."
        react={metricsBarReact}
        vanilla={`${vanillaSetup}\n\n${metricsBarVanilla}`}
      >
        <FakeBar />
      </LiveExample>

      {/* MetricsPanel */}
      <h2 className="text-lg font-semibold mb-1 mt-10">MetricsPanel</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Vertical card with progress bars. Three size variants, optional two-column layout.
      </p>
      <LiveExample
        title="Default (size=&quot;m&quot;)"
        description="Full bars, load score, net traffic."
        react={metricsPanelReact}
        vanilla={`${vanillaSetup}\n\n${metricsPanelVanilla}`}
        center
      >
        <FakePanel />
      </LiveExample>

      {/* TimeSeriesChart */}
      <h2 className="text-lg font-semibold mb-1 mt-10">TimeSeriesChart</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Line chart for a single metric. Supports L1 / L2 / L3 history levels.
      </p>
      <LiveExample
        title="CPU — L1 (last hour)"
        description="1-second resolution, up to 3 600 points."
        react={timeSeriesReact}
        vanilla={`${vanillaSetup}\n\n${timeSeriesVanilla}`}
      >
        <FakeChart />
      </LiveExample>
    </div>
  );
}
