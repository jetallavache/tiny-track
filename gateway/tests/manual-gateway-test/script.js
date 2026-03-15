/* TinyTrack Gateway Manual Test Client */

const log = document.getElementById('log');
const metricsDiv = document.getElementById('metrics');
const wsStatusDiv = document.getElementById('wsStatus');

let ws = null;
let metricsData = [];

function addLog(msg) {
  const time = new Date().toLocaleTimeString();
  log.innerHTML += `[${time}] ${msg}<br>`;
  log.scrollTop = log.scrollHeight;
}

function updateMetricsDisplay(data) {
  metricsData.unshift(data);
  if (metricsData.length > 10) metricsData.pop();
  
  const latest = metricsData[0];
  metricsDiv.innerHTML = `
    <div style="font-family: monospace;">
      <strong>Latest Metrics:</strong><br>
      CPU: ${latest.cpu/100}% | MEM: ${latest.mem/100}% | LOAD: ${(latest.load1/100).toFixed(2)}<br>
      RX: ${(latest.rx / 1024).toFixed(1)} KB | TX: ${(latest.tx / 1024).toFixed(1)} KB<br>
      DISK: ${latest.disk}%
    </div>
    <hr>
    <div style="font-size: 0.9em;">
      <strong>History (last 10):</strong><br>
      ${metricsData.map((m, i) => 
        `${i}: CPU=${m.cpu/100}% MEM=${m.mem/100}% LOAD=${(m.load1/100).toFixed(2)}`
      ).join('<br>')}
    </div>
  `;
}

/* HTTP API Test */
document.getElementById('fetchMetrics').addEventListener('click', async () => {
  const url = document.getElementById('apiUrl').value;
  addLog(`Fetching: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    metricsDiv.innerHTML = `
      <pre>${JSON.stringify(data, null, 2)}</pre>
    `;
    addLog('✓ Metrics fetched successfully');
  } catch (err) {
    addLog(`✗ Error: ${err.message}`);
    metricsDiv.innerHTML = `<span style="color: red">Error: ${err.message}</span>`;
  }
});

/* WebSocket Test */
document.getElementById('wsConnect').addEventListener('click', () => {
  const url = document.getElementById('wsUrl').value;
  addLog(`Connecting to: ${url}`);
  
  ws = new WebSocket(url);
  
  ws.onopen = () => {
    wsStatusDiv.innerHTML = '<span style="color: green">Connected</span>';
    addLog('✓ WebSocket connected');
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'welcome') {
        addLog(`← Welcome: version ${data.version}`);
      } else if (data.status === 'ok') {
        addLog(`← Config ACK: interval=${data.interval}ms`);
      } else if (data.cpu !== undefined) {
        // Metrics data
        updateMetricsDisplay(data);
        addLog(`← Metrics: CPU=${data.cpu/100}% MEM=${data.mem/100}%`);
      } else {
        addLog(`← Received: ${event.data}`);
      }
    } catch (e) {
      addLog(`← Raw: ${event.data}`);
    }
  };
  
  ws.onerror = (err) => {
    addLog(`✗ WebSocket error: ${err}`);
  };
  
  ws.onclose = () => {
    wsStatusDiv.innerHTML = '<span style="color: red">Disconnected</span>';
    addLog('WebSocket closed');
  };
});

document.getElementById('wsDisconnect').addEventListener('click', () => {
  if (ws) {
    ws.close();
    ws = null;
  }
});

/* Set interval */
document.getElementById('setInterval').addEventListener('click', () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addLog('✗ WebSocket not connected');
    return;
  }
  
  const interval = document.getElementById('intervalInput').value;
  const msg = JSON.stringify({ interval: parseInt(interval) });
  
  ws.send(msg);
  addLog(`→ Sent config: ${msg}`);
});

document.getElementById('clearLog').addEventListener('click', () => {
  log.innerHTML = '';
  metricsData = [];
});

addLog('Test client ready');
addLog('1. Connect to WebSocket');
addLog('2. Set update interval (optional)');
addLog('3. Watch metrics stream');
