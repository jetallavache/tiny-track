# Vanilla JS Example — No React, No Build Step

Use `tinytsdk-lite` with plain HTML and JavaScript. Perfect for simple dashboards or integration into existing projects.

## HTML + CDN

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TinyTrack Metrics</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #0d1117; color: #c9d1d9; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .value { font-size: 24px; font-weight: bold; color: #58a6ff; }
    .label { font-size: 12px; color: #8b949e; }
  </style>
</head>
<body>
  <h1>System Metrics</h1>
  <div id="metrics"></div>

  <script src="https://cdn.jsdelivr.net/npm/tinytsdk-lite/dist/index.esm.js" type="module"></script>
  <script type="module">
    import { TinyTrackClient } from 'https://cdn.jsdelivr.net/npm/tinytsdk-lite/dist/index.esm.js';

    const client = new TinyTrackClient('ws://localhost:25015');
    const metricsDiv = document.getElementById('metrics');

    client.on('metrics', (m) => {
      metricsDiv.innerHTML = `
        <div class="metric">
          <div class="label">CPU</div>
          <div class="value">${(m.cpu / 100).toFixed(1)}%</div>
        </div>
        <div class="metric">
          <div class="label">Memory</div>
          <div class="value">${(m.mem / 100).toFixed(1)}%</div>
        </div>
        <div class="metric">
          <div class="label">Disk</div>
          <div class="value">${(m.duUsage / 100).toFixed(1)}%</div>
        </div>
        <div class="metric">
          <div class="label">Load (1m)</div>
          <div class="value">${(m.load1 / 100).toFixed(2)}</div>
        </div>
      `;
    });

    client.on('error', (err) => {
      metricsDiv.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
    });

    client.connect();
  </script>
</body>
</html>
```

## IIFE Bundle (tinytsdk)

```html
<!DOCTYPE html>
<html>
<head>
  <title>TinyTrack Dashboard</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .gauge { display: inline-block; width: 100px; height: 100px; margin: 10px; }
    canvas { border: 1px solid #ccc; }
  </style>
</head>
<body>
  <h1>Real-time Metrics</h1>
  <div id="dashboard"></div>

  <script src="https://cdn.jsdelivr.net/npm/tinytsdk/dist/tinytsdk.min.js"></script>
  <script>
    const client = new TinyTrack.TinyTrackClient('ws://localhost:25015');
    const dashboard = document.getElementById('dashboard');

    client.on('metrics', (m) => {
      dashboard.innerHTML = `
        <p>CPU: <strong>${(m.cpu / 100).toFixed(1)}%</strong></p>
        <p>Memory: <strong>${(m.mem / 100).toFixed(1)}%</strong></p>
        <p>Disk: <strong>${(m.duUsage / 100).toFixed(1)}%</strong></p>
        <p>Load: <strong>${(m.load1 / 100).toFixed(2)}</strong></p>
        <p><small>${new Date(m.timestamp * 1000).toLocaleTimeString()}</small></p>
      `;
    });

    client.connect();
  </script>
</body>
</html>
```

## Node.js (Server-side)

```js
import { TinyTrackClient } from 'tinytsdk-lite';

const client = new TinyTrackClient('ws://localhost:25015');

client.on('metrics', (m) => {
  console.log(`[${new Date().toISOString()}] CPU: ${(m.cpu / 100).toFixed(1)}% | MEM: ${(m.mem / 100).toFixed(1)}%`);
});

client.on('error', (err) => {
  console.error('Connection error:', err);
});

await client.connect();
console.log('Connected to TinyTrack');
```
