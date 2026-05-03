import { LiveExample } from '@/components/live-example';
import {
  LiveMetricsBar,
  LiveMetricsPanel,
  LiveTimeSeriesChart,
  LiveDashboard,
  LiveTimeline,
  LiveDiskMap,
  LiveSparkline,
  LiveSystemLoad,
} from '@/components/live-previews';

/* --- Shared vanilla setup snippet --- */
const vanillaSetup = `<script src="https://cdn.jsdelivr.net/npm/tinytsdk/dist/tinytsdk.min.js"></script>
<script>
  const client = new TinyTrack.TinyTrackClient('ws://your-host:25015');
  client.connect();
</script>`;

/* --- Props table --- */
function PropsTable({ rows }: { rows: { name: string; type: string; default?: string; desc: string }[] }) {
  return (
    <div className="not-prose overflow-x-auto rounded-lg border border-border mb-10">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {['Prop', 'Type', 'Default', 'Description'].map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">
                {h}
              </th>
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

/* --- Component definitions --- */

const COMPONENTS: Record<
  string,
  {
    title: string;
    desc: string;
    preview: React.ReactNode;
    center?: boolean;
    react: string;
    vanilla: string;
    props: { name: string; type: string; default?: string; desc: string }[];
  }
> = {
  'metrics-bar': {
    title: 'MetricsBar',
    desc: 'Compact single-line status bar. Displays all metrics in one horizontal row.',
    preview: <LiveMetricsBar />,
    react: `import { TinyTrackProvider, MetricsBar } from 'tinytsdk/react';

export default function App() {
  return (
    <TinyTrackProvider url="ws://your-host:25015">
      <MetricsBar size="m" />
    </TinyTrackProvider>
  );
}`,
    vanilla: `${vanillaSetup}

<div id="tt-bar" style="font-family:monospace;font-size:13px;
  display:flex;gap:16px;padding:8px 12px;background:#111;border-radius:8px">
  <span>CPU  <b id="tt-cpu">—</b></span>
  <span>RAM  <b id="tt-mem">—</b></span>
  <span>Disk <b id="tt-disk">—</b></span>
  <span>↓ <b id="tt-rx">—</b>  ↑ <b id="tt-tx">—</b></span>
</div>

<script>
  client.on('metrics', (m) => {
    document.getElementById('tt-cpu').textContent  = (m.cpu  / 100).toFixed(1) + '%';
    document.getElementById('tt-mem').textContent  = (m.mem  / 100).toFixed(1) + '%';
    document.getElementById('tt-disk').textContent = (m.disk / 100).toFixed(1) + '%';
    document.getElementById('tt-rx').textContent   = (m.net_rx / 1024).toFixed(1) + ' KB/s';
    document.getElementById('tt-tx').textContent   = (m.net_tx / 1024).toFixed(1) + ' KB/s';
  });
</script>`,
    props: [
      { name: 'size', type: '"s" | "m" | "l"', default: '"m"', desc: 's=icon labels, m=abbreviated, l=full labels' },
      { name: 'metrics', type: 'MetricType[]', default: 'all', desc: 'Metrics to display, in array order' },
      {
        name: 'sysInfo',
        type: 'SysInfoType[]',
        default: '—',
        desc: '"uptime" | "hostname" | "os-type" | "ringbufInfo"',
      },
      { name: 'showAlerts', type: 'boolean', default: 'true', desc: 'Show alert lamp badges' },
      { name: 'theme', type: 'Partial<TtTheme>', default: '—', desc: 'Per-component token overrides' },
    ],
  },

  'metrics-panel': {
    title: 'MetricsPanel',
    desc: 'Vertical card with progress bars. Three size variants, optional two-column layout.',
    preview: <LiveMetricsPanel />,
    center: true,
    react: `import { TinyTrackProvider, MetricsPanel } from 'tinytsdk/react';

export default function App() {
  return (
    <TinyTrackProvider url="ws://your-host:25015">
      <MetricsPanel size="m" />
    </TinyTrackProvider>
  );
}`,
    vanilla: `${vanillaSetup}

<div style="font-family:monospace;font-size:12px;background:#111;
  border-radius:8px;padding:16px;width:240px;display:flex;flex-direction:column;gap:10px">
  <div style="display:flex;align-items:center;gap:8px">
    <span style="width:32px;color:#888">CPU</span>
    <progress id="tt-p-cpu" max="100" value="0" style="flex:1"></progress>
    <span id="tt-v-cpu" style="width:40px;text-align:right">—</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px">
    <span style="width:32px;color:#888">RAM</span>
    <progress id="tt-p-mem" max="100" value="0" style="flex:1"></progress>
    <span id="tt-v-mem" style="width:40px;text-align:right">—</span>
  </div>
</div>

<script>
  client.on('metrics', (m) => {
    const set = (id, val) => {
      document.getElementById('tt-p-' + id).value       = val;
      document.getElementById('tt-v-' + id).textContent = val.toFixed(1) + '%';
    };
    set('cpu',  m.cpu  / 100);
    set('mem',  m.mem  / 100);
  });
</script>`,
    props: [
      {
        name: 'size',
        type: '"s" | "m" | "l"',
        default: '"m"',
        desc: 's: % only; m: bars + load; l: full labels, OS info',
      },
      { name: 'columns', type: '1 | 2', default: '1', desc: '2 = two-column split' },
      { name: 'metrics', type: 'MetricType[]', default: 'all', desc: 'Metrics to display, in array order' },
      { name: 'theme', type: 'Partial<TtTheme>', default: '—', desc: 'Per-component token overrides' },
    ],
  },

  'time-series-chart': {
    title: 'TimeSeriesChart',
    desc: 'Line chart for a single metric. Supports L1 / L2 / L3 history levels with optional min/max band.',
    preview: <LiveTimeSeriesChart />,
    react: `import { TinyTrackProvider, TimeSeriesChart } from 'tinytsdk/react';
import { RING_L1 } from 'tinytsdk';

export default function App() {
  return (
    <TinyTrackProvider url="ws://your-host:25015">
      <TimeSeriesChart metrics={['cpu']} level={RING_L1} />
    </TinyTrackProvider>
  );
}`,
    vanilla: `${vanillaSetup}

<canvas id="tt-chart" width="400" height="80"
  style="background:#111;border-radius:8px;display:block"></canvas>

<script>
  const canvas  = document.getElementById('tt-chart');
  const ctx     = canvas.getContext('2d');
  const history = [];
  const MAX     = 60;

  client.on('metrics', (m) => {
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
</script>`,
    props: [
      { name: 'metrics', type: 'MetricType[]', default: '["cpu"]', desc: 'One or more metrics to overlay' },
      { name: 'level', type: 'number', default: 'RING_L1', desc: 'Ring buffer level (RING_L1/L2/L3)' },
      { name: 'maxSamples', type: 'number', default: '60', desc: 'Rolling window size' },
      { name: 'aggregation', type: 'AggregationType', default: '—', desc: 'Controlled aggregation (avg/max/min)' },
      { name: 'height', type: 'number', default: 'size-derived', desc: 'Chart height in px' },
    ],
  },

  dashboard: {
    title: 'Dashboard',
    desc: 'Full admin dashboard with gauges, time-series charts, ring buffer status, and server controls.',
    preview: <LiveDashboard />,
    react: `import { TinyTrackProvider, Dashboard } from 'tinytsdk/react';

export default function App() {
  return (
    <TinyTrackProvider url="ws://your-host:25015">
      <Dashboard mode="compact" />
    </TinyTrackProvider>
  );
}`,
    vanilla: `${vanillaSetup}

<svg id="tt-gauge" width="120" height="120" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="50" fill="none" stroke="#222" stroke-width="10"/>
  <circle id="tt-arc" cx="60" cy="60" r="50" fill="none"
    stroke="#22c55e" stroke-width="10"
    stroke-dasharray="314" stroke-dashoffset="314"
    stroke-linecap="round"
    transform="rotate(-90 60 60)"/>
  <text id="tt-val" x="60" y="66"
    text-anchor="middle" font-size="18" fill="#fff" font-family="monospace">—</text>
</svg>

<script>
  const arc = document.getElementById('tt-arc');
  const val = document.getElementById('tt-val');

  client.on('metrics', (m) => {
    const pct    = m.cpu / 10000;
    const offset = 314 * (1 - pct);
    arc.style.strokeDashoffset = offset;
    arc.style.stroke = pct > 0.9 ? '#ef4444' : pct > 0.7 ? '#f59e0b' : '#22c55e';
    val.textContent  = (pct * 100).toFixed(0) + '%';
  });
</script>`,
    props: [
      { name: 'mode', type: '"compact" | "expanded"', default: '"compact"', desc: 'compact: gauges + status only' },
      { name: 'historySize', type: 'number', default: '60', desc: 'Sparkline history buffer size' },
      { name: 'showSysInfo', type: 'boolean', default: 'true', desc: 'Show hostname/OS/uptime row' },
      { name: 'theme', type: 'Partial<TtTheme>', default: '—', desc: 'Per-component token overrides' },
    ],
  },

  timeline: {
    title: 'Timeline',
    desc: 'Scrollable bar chart across all three ring levels (L1/L2/L3). Supports aggregation switching.',
    preview: <LiveTimeline />,
    react: `import { TinyTrackProvider, Timeline } from 'tinytsdk/react';

export default function App() {
  return (
    <TinyTrackProvider url="ws://your-host:25015">
      <Timeline metrics={['cpu']} />
    </TinyTrackProvider>
  );
}`,
    vanilla: `/* Timeline requires the React component for full functionality. */`,
    props: [
      { name: 'metrics', type: 'MetricType[]', default: '["cpu"]', desc: 'Metrics to overlay on each row' },
      { name: 'aggregation', type: 'AggregationType', default: '—', desc: 'Controlled aggregation' },
      { name: 'rowHeight', type: 'number', default: 'size-derived', desc: 'Per-row SVG height in px' },
    ],
  },

  'disk-map': {
    title: 'DiskMap',
    desc: 'Disk space visualisation with ring (donut) and matrix modes.',
    preview: <LiveDiskMap />,
    center: true,
    react: `import { TinyTrackProvider, DiskMap } from 'tinytsdk/react';

export default function App() {
  return (
    <TinyTrackProvider url="ws://your-host:25015">
      <DiskMap mode="ring" />
    </TinyTrackProvider>
  );
}`,
    vanilla: `/* DiskMap requires the React component. */`,
    props: [
      { name: 'mode', type: '"ring" | "matrix"', default: '"ring"', desc: 'Visualisation mode' },
      { name: 'segments', type: 'DiskSegment[]', default: '—', desc: 'External named segments' },
      { name: 'theme', type: 'Partial<TtTheme>', default: '—', desc: 'Per-component token overrides' },
    ],
  },

  sparkline: {
    title: 'Sparkline',
    desc: 'Minimal inline sparkline chart. Subscribes to TinyTrackProvider for live data.',
    preview: <LiveSparkline />,
    center: true,
    react: `import { TinyTrackProvider, Sparkline } from 'tinytsdk/react';

export default function App() {
  return (
    <TinyTrackProvider url="ws://your-host:25015">
      <Sparkline metric="cpu" width={200} height={48} />
    </TinyTrackProvider>
  );
}`,
    vanilla: `${vanillaSetup}

<canvas id="tt-spark" width="200" height="48"></canvas>

<script>
  const canvas = document.getElementById('tt-spark');
  const ctx    = canvas.getContext('2d');
  const buf    = [];

  client.on('metrics', (m) => {
    buf.push(m.cpu / 100);
    if (buf.length > 60) buf.shift();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth   = 1.5;
    buf.forEach((v, i) => {
      const x = (i / (buf.length - 1)) * canvas.width;
      const y = canvas.height - v * canvas.height;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
</script>`,
    props: [
      { name: 'metric', type: 'MetricType', default: '"cpu"', desc: 'Metric to plot from provider' },
      { name: 'data', type: 'number[]', default: '—', desc: 'External data array (overrides metric)' },
      { name: 'maxSamples', type: 'number', default: '60', desc: 'Rolling buffer size' },
      { name: 'width', type: 'number', default: '120', desc: 'Canvas width in px' },
      { name: 'height', type: 'number', default: 'size-derived', desc: 'Canvas height in px' },
    ],
  },

  'system-load': {
    title: 'SystemLoad',
    desc: 'Semi-circular gauge showing overall system load score with 1m/5m/15m averages.',
    preview: <LiveSystemLoad />,
    center: true,
    react: `import { TinyTrackProvider, SystemLoad } from 'tinytsdk/react';

export default function App() {
  return (
    <TinyTrackProvider url="ws://your-host:25015">
      <SystemLoad size="m" />
    </TinyTrackProvider>
  );
}`,
    vanilla: `${vanillaSetup}

<div style="font-family:monospace;font-size:12px">
  Load: <span id="tt-l1">—</span> / <span id="tt-l5">—</span> / <span id="tt-l15">—</span>
</div>

<script>
  client.on('metrics', (m) => {
    document.getElementById('tt-l1').textContent  = (m.load1  / 100).toFixed(2);
    document.getElementById('tt-l5').textContent  = (m.load5  / 100).toFixed(2);
    document.getElementById('tt-l15').textContent = (m.load15 / 100).toFixed(2);
  });
</script>`,
    props: [
      { name: 'size', type: '"s" | "m" | "l"', default: '"m"', desc: 'Component size variant' },
      { name: 'theme', type: 'Partial<TtTheme>', default: '—', desc: 'Per-component token overrides' },
    ],
  },
};

/* --- Page component --- */

export async function ComponentsPage({ slug }: { slug: string }) {
  const def = COMPONENTS[slug];
  if (!def) return <p className="text-muted-foreground">Component not found.</p>;

  const { title, desc, preview, center, react, vanilla, props } = def;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
      <p className="text-muted-foreground text-sm mb-8">{desc}</p>

      <LiveExample react={react} vanilla={vanilla} center={center}>
        {preview}
      </LiveExample>

      <h2 className="text-lg font-semibold mb-3 mt-2">Props</h2>
      <PropsTable rows={props} />
    </div>
  );
}
