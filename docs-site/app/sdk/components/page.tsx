import { DocsLayout } from '@/components/docs-layout';
import { sdkNavItems } from '@/lib/docs';
import { LiveExample } from '@/components/live-example';

/* ── snippets ─────────────────────────────────────────────────────────────── */

const vanillaSetup = `<script src="https://cdn.jsdelivr.net/npm/tinytsdk/dist/tinytsdk.min.js"></script>
<script>
  window.__tt = new TinyTrack.TinyTrackClient('ws://your-host:25015');
  window.__tt.connect();
</script>`;

const metricsBarReact = `import { MetricsBar } from 'tinytsdk/react';

// Inside TinyTrackProvider:
<MetricsBar size="m" />

// With system info badges:
<MetricsBar
  size="l"
  sysInfo={['hostname', 'uptime', 'os-type']}
  style={{ width: '100%' }}
/>`;

const metricsBarVanilla = `${vanillaSetup}

<!-- Status bar -->
<div id="tt-bar" style="font-family:monospace;font-size:13px;
  display:flex;gap:16px;padding:8px 12px;background:#111;border-radius:8px">
  <span>CPU  <b id="tt-cpu">—</b></span>
  <span>RAM  <b id="tt-mem">—</b></span>
  <span>Disk <b id="tt-disk">—</b></span>
  <span>↓ <b id="tt-rx">—</b>  ↑ <b id="tt-tx">—</b></span>
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

const metricsPanelVanilla = `${vanillaSetup}

<!-- Vertical card with progress bars -->
<div style="font-family:monospace;font-size:12px;background:#111;
  border-radius:8px;padding:16px;width:240px;display:flex;flex-direction:column;gap:10px">
  <div style="display:flex;align-items:center;gap:8px">
    <span style="width:32px;color:#888">CPU</span>
    <progress id="tt-p-cpu"  max="100" value="0" style="flex:1"></progress>
    <span id="tt-v-cpu"  style="width:40px;text-align:right">—</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px">
    <span style="width:32px;color:#888">RAM</span>
    <progress id="tt-p-mem"  max="100" value="0" style="flex:1"></progress>
    <span id="tt-v-mem"  style="width:40px;text-align:right">—</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px">
    <span style="width:32px;color:#888">Disk</span>
    <progress id="tt-p-disk" max="100" value="0" style="flex:1"></progress>
    <span id="tt-v-disk" style="width:40px;text-align:right">—</span>
  </div>
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

const timeSeriesReact = `import { TimeSeriesChart } from 'tinytsdk/react';

// CPU last hour (L1, 1-second resolution):
<TimeSeriesChart metric="cpu" level="l1" />

// Memory last 24h (L2) with min/max band:
<TimeSeriesChart metric="mem" level="l2" showBand />

// Auto-select level by time range:
<TimeSeriesChart metric="cpu" autoLevel range="6h" />`;

const timeSeriesVanilla = `${vanillaSetup}

<!-- Canvas sparkline -->
<canvas id="tt-chart" width="400" height="80"
  style="background:#111;border-radius:8px;display:block"></canvas>

<script>
  const canvas  = document.getElementById('tt-chart');
  const ctx     = canvas.getContext('2d');
  const history = [];
  const MAX     = 60;

  window.__tt.on('metrics', (m) => {
    history.push(m.cpu / 100);
    if (history.length > MAX) history.shift();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth   = 1.5;

    history.forEach((v, i) => {
      const x = (i / (MAX - 1)) * canvas.width;
      const y = canvas.height - (v / 100) * canvas.height;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
</script>`;

const dashboardReact = `import { Dashboard } from 'tinytsdk/react';

// Full admin dashboard:
<Dashboard />

// Compact mode (gauges only):
<Dashboard mode="compact" />`;

const dashboardVanilla = `${vanillaSetup}

<!-- Gauge using SVG arc -->
<svg id="tt-gauge" width="120" height="120" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="50" fill="none" stroke="#222" stroke-width="10"/>
  <circle id="tt-arc" cx="60" cy="60" r="50" fill="none"
    stroke="#22c55e" stroke-width="10"
    stroke-dasharray="314" stroke-dashoffset="314"
    stroke-linecap="round"
    transform="rotate(-90 60 60)"/>
  <text id="tt-gauge-val" x="60" y="66"
    text-anchor="middle" font-size="18" fill="#fff" font-family="monospace">—</text>
</svg>

<script>
  const arc       = document.getElementById('tt-arc');
  const gaugeVal  = document.getElementById('tt-gauge-val');
  const circumference = 314;

  window.__tt.on('metrics', (m) => {
    const pct    = m.cpu / 10000;          // 0..1
    const offset = circumference * (1 - pct);
    arc.style.strokeDashoffset = offset;
    arc.style.stroke = pct > 0.9 ? '#ef4444' : pct > 0.7 ? '#f59e0b' : '#22c55e';
    gaugeVal.textContent = (pct * 100).toFixed(0) + '%';
  });
</script>`;

/* ── fake previews ────────────────────────────────────────────────────────── */

function FakeBar() {
  return (
    <div className="flex flex-wrap gap-4 items-center px-3 py-2 rounded-lg bg-muted/50 font-mono text-xs">
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

function FakeGauge({ value = 23, label = 'CPU' }: { value?: number; label?: string }) {
  const r = 40, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * r;
  const pct = value / 100;
  const offset = circumference * (1 - pct * 0.75); // 270° arc
  const color = pct > 0.9 ? '#ef4444' : pct > 0.7 ? '#f59e0b' : '#22c55e';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#333" strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${circumference * 0.75 * pct} ${circumference}`}
          strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fill="white" fontFamily="monospace" fontWeight="bold">
          {value}%
        </text>
      </svg>
      <span className="text-xs text-muted-foreground font-mono">{label}</span>
    </div>
  );
}

/* ── props tables ─────────────────────────────────────────────────────────── */

function PropsTable({ rows }: { rows: { name: string; type: string; default?: string; desc: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {['Prop', 'Type', 'Default', 'Description'].map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2 font-mono text-primary">{r.name}</td>
              <td className="px-3 py-2 font-mono text-blue-400">{r.type}</td>
              <td className="px-3 py-2 font-mono text-muted-foreground">{r.default ?? '—'}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────────────────── */

export default async function ComponentsPage() {
  return (
    <DocsLayout section="SDK" items={sdkNavItems()} activeHref="/sdk/components">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Components</h1>
      <p className="text-muted-foreground text-sm mb-10">
        Every example shows a live preview, the React snippet, and the Vanilla JS equivalent.
        See <a href="/sdk/getting-started" className="text-primary hover:underline">Getting Started</a> to set up your project first.
      </p>

      {/* MetricsBar */}
      <h2 className="text-xl font-semibold mb-1">MetricsBar</h2>
      <p className="text-sm text-muted-foreground mb-4">Compact single-line status bar. All metrics in one row.</p>
      <LiveExample title='size="m" — default' react={metricsBarReact} vanilla={metricsBarVanilla}>
        <FakeBar />
      </LiveExample>
      <PropsTable rows={[
        { name: 'size', type: '"s" | "m" | "l"', default: '"m"', desc: 's=icon labels, m=abbreviated, l=full labels' },
        { name: 'metrics', type: 'MetricType[]', default: 'all', desc: 'Metrics to display, in array order' },
        { name: 'sysInfo', type: 'SysInfoType[]', default: '—', desc: '"uptime" | "hostname" | "os-type" | "ringbufInfo"' },
        { name: 'showAlerts', type: 'boolean', default: 'true', desc: 'Show alert lamp badges' },
        { name: 'theme', type: 'Partial<TtTheme>', default: '—', desc: 'Per-component token overrides' },
      ]} />

      {/* MetricsPanel */}
      <h2 className="text-xl font-semibold mb-1 mt-12">MetricsPanel</h2>
      <p className="text-sm text-muted-foreground mb-4">Vertical card with progress bars. Three size variants, optional two-column layout.</p>
      <LiveExample title='size="m" — default' react={metricsPanelReact} vanilla={metricsPanelVanilla} center>
        <FakePanel />
      </LiveExample>
      <PropsTable rows={[
        { name: 'size', type: '"s" | "m" | "l"', default: '"m"', desc: 's: % only; m: bars + load; l: full labels, OS info' },
        { name: 'columns', type: '1 | 2', default: '1', desc: '2 = two-column split' },
        { name: 'metrics', type: 'MetricType[]', default: 'all', desc: 'Metrics to display, in array order' },
        { name: 'theme', type: 'Partial<TtTheme>', default: '—', desc: 'Per-component token overrides' },
      ]} />

      {/* TimeSeriesChart */}
      <h2 className="text-xl font-semibold mb-1 mt-12">TimeSeriesChart</h2>
      <p className="text-sm text-muted-foreground mb-4">Line chart for a single metric. Supports L1 / L2 / L3 history levels.</p>
      <LiveExample title="CPU — L1 (last hour, 1-second resolution)" react={timeSeriesReact} vanilla={timeSeriesVanilla}>
        <FakeChart />
      </LiveExample>
      <PropsTable rows={[
        { name: 'metric', type: 'MetricType', default: '"cpu"', desc: 'Which metric to plot' },
        { name: 'level', type: '"l1" | "l2" | "l3"', default: '"l1"', desc: 'Ring buffer level' },
        { name: 'showBand', type: 'boolean', default: 'false', desc: 'Show min/max band around avg line (L2/L3)' },
        { name: 'autoLevel', type: 'boolean', default: 'false', desc: 'Auto-select level based on range prop' },
        { name: 'range', type: 'string', default: '—', desc: 'Time range for autoLevel: "1h", "6h", "24h", "7d"' },
      ]} />

      {/* Dashboard */}
      <h2 className="text-xl font-semibold mb-1 mt-12">Dashboard</h2>
      <p className="text-sm text-muted-foreground mb-4">Full admin dashboard with gauges, time-series charts, ring buffer status, and server controls.</p>
      <LiveExample title="Gauges — compact mode" react={dashboardReact} vanilla={dashboardVanilla} center>
        <div className="flex gap-6">
          <FakeGauge value={23} label="CPU" />
          <FakeGauge value={41} label="RAM" />
          <FakeGauge value={58} label="Disk" />
        </div>
      </LiveExample>
      <PropsTable rows={[
        { name: 'mode', type: '"compact" | "expanded"', default: '"expanded"', desc: 'compact: gauges + status only' },
        { name: 'aggregation', type: '"avg" | "max" | "min"', default: '"avg"', desc: 'Aggregation type for charts' },
        { name: 'theme', type: 'Partial<TtTheme>', default: '—', desc: 'Per-component token overrides' },
      ]} />
    </DocsLayout>
  );
}
