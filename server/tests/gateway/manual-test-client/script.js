/* TinyTrack Gateway Manual Test Client */

const log = document.getElementById('log');
const metricsDiv = document.getElementById('metrics');
const statsDiv = document.getElementById('stats');
const sysInfoDiv = document.getElementById('sysinfo');
const wsStatus = document.getElementById('wsStatus');

let ws = null;
let historyBuf = [];

/* ------------------------------------------------------------------ */
/* Logging                                                              */
/* ------------------------------------------------------------------ */

function addLog(msg) {
  const time = new Date().toLocaleTimeString();
  log.innerHTML += `[${time}] ${msg}<br>`;
  log.scrollTop = log.scrollHeight;
}

/* ------------------------------------------------------------------ */
/* Display helpers                                                       */
/* ------------------------------------------------------------------ */

function fmtPct(val) {
  return (val / 100).toFixed(1) + '%';
}
function fmtLoad(val) {
  return (val / 100).toFixed(2);
}
function fmtNet(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB/s';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB/s';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB/s';
  return bytes + ' B/s';
}

function renderMetrics(m) {
  const ts = m.timestamp > 0 ? new Date(m.timestamp).toLocaleTimeString() : 'N/A';
  metricsDiv.innerHTML =
    `<b>CPU:</b> ${fmtPct(m.cpu_usage)} &nbsp;` +
    `<b>MEM:</b> ${fmtPct(m.mem_usage)} &nbsp;` +
    `<b>DISK:</b> ${fmtPct(m.du_usage)}<br>` +
    `<b>Load:</b> ${fmtLoad(m.load_1min)} / ${fmtLoad(m.load_5min)} / ${fmtLoad(m.load_15min)}<br>` +
    `<b>RX:</b> ${fmtNet(m.net_rx)} &nbsp;<b>TX:</b> ${fmtNet(m.net_tx)}<br>` +
    `<b>Procs:</b> ${m.nr_running} running / ${m.nr_total} total &nbsp;` +
    `<b>ts:</b> ${ts}`;
}

function renderStats(s) {
  const row = (r) => `L${r.level}: capacity=${r.capacity} head=${r.head} filled=${r.filled}`;
  statsDiv.innerHTML = `<b>Ring buffer stats:</b><br>${row(s.l1)}<br>${row(s.l2)}<br>${row(s.l3)}`;
}

function renderSysInfo(info) {
  function fmtUptime(sec) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }
  sysInfoDiv.innerHTML =
    `<b>System Info:</b><br>` +
    `<b>Hostname:</b> ${info.hostname}<br>` +
    `<b>OS:</b> ${info.os_type}<br>` +
    `<b>Uptime:</b> ${fmtUptime(info.uptime_sec)}<br>` +
    `<b>Ring slots:</b> L1=${info.slots_l1} L2=${info.slots_l2} L3=${info.slots_l3}<br>` +
    `<b>Interval:</b> ${info.interval_ms}ms &nbsp;` +
    `<b>Agg L1→L2:</b> ${info.agg_l2_ms}ms &nbsp;` +
    `<b>Agg L2→L3:</b> ${info.agg_l3_ms}ms`;
}

/* ------------------------------------------------------------------ */
/* Protocol handlers                                                    */
/* ------------------------------------------------------------------ */

const handlers = {
  onConfig({ intervalMs, alertsEnabled }) {
    addLog(`← PKT_CONFIG: interval=${intervalMs}ms alerts=${alertsEnabled}`);
    document.getElementById('intervalInput').value = intervalMs;
  },

  onMetrics(m) {
    renderMetrics(m);
    addLog(`← PKT_METRICS: CPU=${fmtPct(m.cpu_usage)} MEM=${fmtPct(m.mem_usage)} RX=${fmtNet(m.net_rx)}`);
  },

  onAck({ cmdType, status, ok }) {
    const label = cmdType === PROTO.CMD_AUTH
      ? (status === PROTO.ACK_OK ? '✓ AUTH OK' : status === PROTO.ACK_AUTH_FAIL ? '✗ AUTH FAIL' : 'AUTH ERROR')
      : (ok ? 'OK' : 'ERROR');
    addLog(`← PKT_ACK: cmd=0x${cmdType.toString(16)} status=${label}`);
    if (cmdType === PROTO.CMD_AUTH && ok) {
      wsStatus.innerHTML = '<span style="color:green">Connected (authenticated)</span>';
    }
  },

  onAlert({ level, message }) {
    const labels = ['', 'INFO', 'WARNING', 'CRITICAL'];
    addLog(`← PKT_ALERT [${labels[level] ?? level}]: ${message}`);
  },

  onAuthReq() {
    addLog('← PKT_AUTH_REQ: server requires authentication');
    const token = document.getElementById('authToken').value.trim();
    if (token) {
      send(buildAuth(token));
      addLog(`→ CMD_AUTH (token: ${token.slice(0, 4)}***)`);
    } else {
      addLog('✗ Auth required but no token set — fill in the Auth Token field');
      wsStatus.innerHTML = '<span style="color:orange">Auth required</span>';
    }
  },

  onHistoryResp({ level, samples, isLast }) {    historyBuf.push(...samples);
    addLog(`← PKT_HISTORY_RESP: level=${level} +${samples.length} samples (last=${isLast})`);
    if (isLast) {
      addLog(`  History complete: ${historyBuf.length} total samples`);
      renderHistory(historyBuf);
      historyBuf = [];
    }
  },

  onRingStats(s) {
    renderStats(s);
    addLog(`← PKT_RING_STATS: L1 filled=${s.l1.filled} L2=${s.l2.filled} L3=${s.l3.filled}`);
  },

  onSysInfo(info) {
    renderSysInfo(info);
    addLog(`← PKT_SYS_INFO: ${info.hostname} | ${info.os_type} | uptime=${info.uptime_sec}s`);
  },
};

function renderHistory(samples) {
  if (!samples.length) return;
  const rows = samples
    .slice(-20)
    .map(
      (m) =>
        `<tr><td>${new Date(m.timestamp).toLocaleTimeString()}</td>` +
        `<td>${fmtPct(m.cpu_usage)}</td><td>${fmtPct(m.mem_usage)}</td>` +
        `<td>${fmtLoad(m.load_1min)}</td></tr>`,
    )
    .join('');
  metricsDiv.innerHTML +=
    `<br><b>History (last 20):</b><table border="1" cellpadding="3">` +
    `<tr><th>Time</th><th>CPU</th><th>MEM</th><th>Load1</th></tr>${rows}</table>`;
}

/* ------------------------------------------------------------------ */
/* WebSocket                                                            */
/* ------------------------------------------------------------------ */

function send(buf) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addLog('✗ Not connected');
    return;
  }
  ws.send(buf);
}

document.getElementById('wsConnect').addEventListener('click', () => {
  const url = document.getElementById('wsUrl').value;
  addLog(`Connecting to: ${url}`);

  ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer'; /* receive binary frames as ArrayBuffer */

  ws.onopen = () => {
    wsStatus.innerHTML = '<span style="color:green">Connected</span>';
    addLog('✓ WebSocket connected');
  };

  ws.onmessage = ({ data }) => {
    const frame = parseFrame(data);
    if (!frame) {
      addLog('✗ Invalid frame');
      return;
    }
    dispatchFrame(frame, handlers);
  };

  ws.onerror = () => addLog('✗ WebSocket error');

  ws.onclose = () => {
    wsStatus.innerHTML = '<span style="color:red">Disconnected</span>';
    addLog('WebSocket closed');
    ws = null;
  };
});

document.getElementById('wsDisconnect').addEventListener('click', () => {
  ws?.close();
});

/* ------------------------------------------------------------------ */
/* Controls                                                             */
/* ------------------------------------------------------------------ */

document.getElementById('setInterval').addEventListener('click', () => {
  const ms = parseInt(document.getElementById('intervalInput').value);
  send(buildCmd(PROTO.CMD_SET_INTERVAL, ms));
  addLog(`→ CMD_SET_INTERVAL: ${ms}ms`);
});

document.getElementById('getSnapshot').addEventListener('click', () => {
  send(buildCmd(PROTO.CMD_GET_SNAPSHOT));
  addLog('→ CMD_GET_SNAPSHOT');
});

document.getElementById('getStats').addEventListener('click', () => {
  send(buildCmd(PROTO.CMD_GET_RING_STATS));
  addLog('→ CMD_GET_RING_STATS');
});

document.getElementById('getSysInfo').addEventListener('click', () => {
  send(buildCmd(PROTO.CMD_GET_SYS_INFO));
  addLog('→ CMD_GET_SYS_INFO');
});

document.getElementById('streamStart').addEventListener('click', () => {
  send(buildCmd(PROTO.CMD_START));
  addLog('→ CMD_START (resume streaming)');
});

document.getElementById('streamStop').addEventListener('click', () => {
  send(buildCmd(PROTO.CMD_STOP));
  addLog('→ CMD_STOP (pause streaming)');
});

document.getElementById('subscribe').addEventListener('click', () => {
  const level = parseInt(document.getElementById('subLevel').value);
  const ms = parseInt(document.getElementById('intervalInput').value);
  send(buildSubscribe(level, ms));
  addLog(`→ PKT_SUBSCRIBE: level=${level} interval=${ms}ms`);
});

document.getElementById('getHistory').addEventListener('click', () => {
  const level = parseInt(document.getElementById('histLevel').value);
  const count = parseInt(document.getElementById('histCount').value);
  historyBuf = [];
  send(buildHistoryReq(level, count));
  addLog(`→ PKT_HISTORY_REQ: level=${level} max=${count}`);
});

document.getElementById('fetchMetrics').addEventListener('click', async () => {
  const base = document.getElementById('apiUrl').value;
  const fmt = document.getElementById('apiFormat').value;
  const url = `${base}v1/metrics${fmt ? '?format=' + fmt : ''}`;
  const token = document.getElementById('authToken').value.trim();
  try {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const r = await fetch(url, { headers });
    const text = await r.text();
    document.getElementById('prometheusOut').textContent = text;
    addLog(`✓ GET ${url} → ${r.status} (${fmt || 'json'})`);
  } catch (e) {
    addLog(`✗ HTTP error: ${e.message}`);
  }
});

document.getElementById('fetchPrometheus').addEventListener('click', async () => {
  const base = document.getElementById('apiUrl').value;
  const url = `${base}v1/metrics?format=prometheus`;
  const token = document.getElementById('authToken').value.trim();
  try {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const r = await fetch(url, { headers });
    const text = await r.text();
    document.getElementById('prometheusOut').textContent = text;
    addLog(`✓ GET ${url} — ${text.split('\n').length} lines`);
  } catch (e) {
    addLog(`✗ Prometheus fetch error: ${e.message}`);
  }
});

document.getElementById('fetchSysinfo').addEventListener('click', async () => {
  const base = document.getElementById('apiUrl').value;
  const token = document.getElementById('authToken').value.trim();
  try {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const r = await fetch(`${base}v1/sysinfo`, { headers });
    const d = await r.json();
    document.getElementById('prometheusOut').textContent = JSON.stringify(d, null, 2);
    addLog(`✓ GET /v1/sysinfo → ${r.status}`);
  } catch (e) { addLog(`✗ ${e.message}`); }
});

document.getElementById('fetchStatus').addEventListener('click', async () => {
  const base = document.getElementById('apiUrl').value;
  try {
    const r = await fetch(`${base}v1/status`);
    const d = await r.json();
    addLog(`✓ GET /v1/status → ${r.status} ${JSON.stringify(d)}`);
  } catch (e) { addLog(`✗ ${e.message}`); }
});

document.getElementById('postPause').addEventListener('click', async () => {
  const base = document.getElementById('apiUrl').value;
  const token = document.getElementById('authToken').value.trim();
  try {
    const headers = { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
    const r = await fetch(`${base}v1/stream/pause`, { method: 'POST', headers });
    addLog(`✓ POST /v1/stream/pause → ${r.status}`);
  } catch (e) { addLog(`✗ ${e.message}`); }
});

document.getElementById('postResume').addEventListener('click', async () => {
  const base = document.getElementById('apiUrl').value;
  const token = document.getElementById('authToken').value.trim();
  try {
    const headers = { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
    const r = await fetch(`${base}v1/stream/resume`, { method: 'POST', headers });
    addLog(`✓ POST /v1/stream/resume → ${r.status}`);
  } catch (e) { addLog(`✗ ${e.message}`); }
});
    const r = await fetch(url);
    const d = await r.json();
    metricsDiv.innerHTML = `<pre>${JSON.stringify(d, null, 2)}</pre>`;
    addLog('✓ HTTP /api/metrics/live fetched');
  } catch (e) {
    addLog(`✗ HTTP error: ${e.message}`);
  }
});

document.getElementById('fetchPrometheus').addEventListener('click', async () => {
  const base = document.getElementById('apiUrl').value;
  const url = base + 'metrics';
  try {
    const r = await fetch(url);
    const text = await r.text();
    document.getElementById('prometheusOut').textContent = text;
    addLog(`✓ GET ${url} — ${text.split('\n').length} lines`);
  } catch (e) {
    addLog(`✗ Prometheus fetch error: ${e.message}`);
  }
});

document.getElementById('clearLog').addEventListener('click', () => {
  log.innerHTML = '';
});

document.getElementById('sendAuth').addEventListener('click', () => {
  const token = document.getElementById('authToken').value.trim();
  if (!token) { addLog('✗ Token is empty'); return; }
  send(buildAuth(token));
  addLog(`→ CMD_AUTH (token: ${token.slice(0, 4)}***)`);
});

addLog('Ready. Connect to WebSocket to start.');
