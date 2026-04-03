/* TinyTrack Gateway Manual Test Client */

const log        = document.getElementById('log');
const metricsDiv = document.getElementById('metrics');
const statsDiv   = document.getElementById('stats');
const sysInfoDiv = document.getElementById('sysinfo');
const wsStatus   = document.getElementById('wsStatus');

let ws = null;
let historyBuf = []; /* accumulate PKT_HISTORY_RESP batches */

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

function fmtPct(val)  { return (val / 100).toFixed(1) + '%'; }
function fmtLoad(val) { return (val / 100).toFixed(2); }
function fmtNet(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB/s';
  if (bytes >= 1024 * 1024)        return (bytes / (1024 * 1024)).toFixed(2) + ' MB/s';
  if (bytes >= 1024)               return (bytes / 1024).toFixed(1) + ' KB/s';
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
  const row = (r) =>
    `L${r.level}: capacity=${r.capacity} head=${r.head} filled=${r.filled}`;
  statsDiv.innerHTML =
    `<b>Ring buffer stats:</b><br>${row(s.l1)}<br>${row(s.l2)}<br>${row(s.l3)}`;
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
    `<b>Agg interval:</b> ${info.agg_interval_ms}ms`;
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

  onAck({ cmdType, ok }) {
    addLog(`← PKT_ACK: cmd=0x${cmdType.toString(16)} status=${ok ? 'OK' : 'ERROR'}`);
  },

  onAlert({ level, message }) {
    const labels = ['', 'INFO', 'WARNING', 'CRITICAL'];
    addLog(`← PKT_ALERT [${labels[level] ?? level}]: ${message}`);
  },

  onHistoryResp({ level, samples, isLast }) {
    historyBuf.push(...samples);
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
  const rows = samples.slice(-20).map(m =>
    `<tr><td>${new Date(m.timestamp).toLocaleTimeString()}</td>` +
    `<td>${fmtPct(m.cpu_usage)}</td><td>${fmtPct(m.mem_usage)}</td>` +
    `<td>${fmtLoad(m.load_1min)}</td></tr>`
  ).join('');
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
    if (!frame) { addLog('✗ Invalid frame'); return; }
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
  const ms    = parseInt(document.getElementById('intervalInput').value);
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
  const url = document.getElementById('apiUrl').value;
  try {
    const r = await fetch(url);
    const d = await r.json();
    metricsDiv.innerHTML = `<pre>${JSON.stringify(d, null, 2)}</pre>`;
    addLog('✓ HTTP metrics fetched');
  } catch (e) {
    addLog(`✗ HTTP error: ${e.message}`);
  }
});

document.getElementById('clearLog').addEventListener('click', () => {
  log.innerHTML = '';
});

addLog('Ready. Connect to WebSocket to start.');
