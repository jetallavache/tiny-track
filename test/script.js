let ws;

let element = function (id) {
  return document.getElementById(id);
};

let url = element('url'),
  connect = element('connect'),
  message = element('message'),
  send = element('send'),
  log = element('log');

var enable = function (en) {
  message.disabled = send.disabled = !en;
  url.disabled = en;
  connect.innerHTML = en ? 'disconnect' : 'connect';
};

enable(false);

let date = function (t) {
  return new Date(t * 1000).toISOString().replace(/T/, ' ').replace(/\..+/, '');
};

let time = function (t) {
  let d = new Date(t * 1000);
  return `${d.getMinutes()}:${d.getSeconds()}`;
};

let validatePacket = function (buffer) {
  const view = new DataView(buffer);
  if (view.getUint8(0) !== 0xaa) return false;
  const rec = view.getUint8(10);
  let calc = 0;
  for (let i = 0; i < 10; i++) calc ^= view.getUint8(i);
  return rec === calc;
};

let decode = function (buffer) {
  const view = new DataView(buffer);
  let offset = 0;
  let object = { header: {}, metrics: {} };
  object.header.magic = view.getUint8(offset, true);
  offset += 1;
  object.header.version = view.getUint8(offset, true);
  offset += 1;
  object.header.packet_type = view.getUint8(offset, true);
  offset += 1;
  object.header.data_length = view.getUint16(offset, true);
  offset += 2;
  object.header.timestamp = view.getUint32(offset, true);
  offset += 4;
  object.header.checksum = view.getUint8(offset, true);
  offset += 1;
  object.metrics.cpu_usage = view.getUint16(offset, true) / 100;
  offset += 2;
  object.metrics.mem_usage = view.getUint16(offset, true) / 100;
  offset += 2;
  object.metrics.net_rx = view.getUint32(offset, true) / 8000;
  offset += 4;
  object.metrics.net_tx = view.getUint32(offset, true) / 8000;
  offset += 4;
  object.metrics.load_1min = view.getUint16(offset, true) / 100;
  offset += 2;
  object.metrics.load_5min = view.getUint16(offset, true) / 100;
  offset += 2;
  object.metrics.load_15min = view.getUint16(offset, true) / 100;
  offset += 2;
  object.metrics.nr_running = view.getUint32(offset, true);
  offset += 4;
  object.metrics.nr_total = view.getUint32(offset, true);
  offset += 4;
  object.metrics.du_usage = view.getUint16(offset, true) / 100;
  offset += 2;
  object.metrics.du_total_bytes = view.getBigUint64(offset, true);
  offset += 8;
  object.metrics.du_free_bytes = view.getBigUint64(offset, true);
  return object;
};

let out = function (packet) {
  const metrics = packet.metrics;
  const header = packet.header;
  log.innerHTML += 'HEADER: ' + '<br/>';
  log.innerHTML +=
    'magic: ' + header.magic + ', version: ' + header.version + ', type: ' + header.packet_type + '<br/>';
  log.innerHTML += 'timestamp: ' + date(header.timestamp) + '<br/>';
  log.innerHTML += 'lenth: ' + header.data_length + ', checksum: ' + header.checksum + '<br/>';
  log.innerHTML += 'METRICS: ' + '<br/>';
  log.innerHTML += 'cpu: ' + metrics.cpu_usage + '%, mem: ' + metrics.mem_usage + '%' + '<br/>';
  log.innerHTML += 'net: ' + metrics.net_rx.toFixed(4) + '/' + metrics.net_tx.toFixed(4) + '<br/>';
  log.innerHTML += 'load: ' + metrics.load_1min + ' ' + metrics.load_5min + ' ' + metrics.load_15min + ' ';
  log.innerHTML += metrics.nr_running + '/' + metrics.nr_total + '<br/>';
  log.innerHTML += 'du: ' + metrics.du_usage + '%/';
  log.innerHTML += (Number(metrics.du_total_bytes) / 1024 / 1024 / 1024).toFixed(1) + ' GB/';
  log.innerHTML += (Number(metrics.du_free_bytes) / 1024 / 1024 / 1024).toFixed(1) + ' GB/' + '<br/>';
  log.innerHTML += 'ALERTS:' + '<br/>';
  if (metrics.alerts.high_cpu) log.innerHTML += 'high_cpu; ';
  if (metrics.alerts.high_mem) log.innerHTML += 'high_mem; ';
  if (metrics.alerts.high_load) log.innerHTML += 'high_load; ';
  if (metrics.alerts.load_decrease) log.innerHTML += 'load_decrease; ';
  if (metrics.alerts.load_increase) log.innerHTML += 'load_increase; ';
  if (metrics.alerts.network_down) log.innerHTML += 'network_down; ';
  if (metrics.alerts.disk_full) log.innerHTML += 'disk_full; ';
  if (metrics.alerts.disk_low) log.innerHTML += 'disk_low; ';
  log.innerHTML += '<br/><br/>';
};

connect.onclick = function () {
  if (ws) {
    ws.close();
    return;
  }
  ws = new WebSocket(url.value);
  if (!ws) return;
  ws.onopen = function () {
    log.innerHTML += 'CONNECTION OPENED<br/>';
  };
  ws.onmessage = function (ev) {
    if (ev.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = function () {
        const uint8arr = new Uint8Array(reader.result);
        // const isValid = validatePacket(uint8arr.buffer);
        const isValid = true;
        const packet = isValid && decode(uint8arr.buffer);
        isValid && out(packet);
      };
      reader.readAsArrayBuffer(ev.data);
    } else log.innerHTML += 'RECEIVED: ' + ev.data + '<br/>';
  };
  ws.onerror = function (ev) {
    log.innerHTML += 'ERROR: ' + ev + '<br/>';
  };
  ws.onclose = function () {
    log.innerHTML += 'CONNECTION CLOSED<br/>';
    enable(false);
    ws = null;
  };
  enable(true);
};

send.onclick = function () {
  if (!ws) return;
  log.innerHTML += 'SENT: ' + message.value + '<br/>';
  ws.send(message.value);
};
