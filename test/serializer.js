// Десериализация на клиенте (JS)
// В React-клиенте через WebSocket:

ws.onmessage = (event) => {
  const buffer = event.data; // Blob или ArrayBuffer
  const view = new DataView(buffer);

  const version = view.getUint8(0);
  const type = view.getUint8(1);
  const length = view.getUint16(2, false); // big-endian

  const payload = buffer.slice(4, 4 + length);

  switch (type) {
    case 1: {
      // metrics
      const dv = new DataView(payload);
      const cpu = dv.getFloat32(0, true);
      const mem = dv.getFloat32(4, true);
      const load1 = dv.getFloat32(8, true);
      console.log('CPU:', cpu, 'MEM:', mem, 'Load1:', load1);
      break;
    }
    case 2: {
      // config (JSON)
      const txt = new TextDecoder().decode(payload);
      const cfg = JSON.parse(txt);
      console.log('Config:', cfg);
      break;
    }
    case 3: {
      // alert
      const txt = new TextDecoder().decode(payload);
      console.warn('ALERT:', txt);
      break;
    }
  }
};

ws.onmessage = (event) => {
  const buf = event.data;
  const view = new DataView(buf);

  const version = view.getUint8(0);
  const type = view.getUint8(1);
  const length = view.getUint16(2, false); // big endian

  if (type === 1) {
    // metrics
    const dv = new DataView(buf, 4);
    const cpu = dv.getFloat32(0, true);
    const mem = dv.getFloat32(4, true);
    console.log('CPU:', cpu, 'MEM:', mem);
  }
};

// Пример: клиент отправляет команду "новый интервал"

function sendSetInterval(ws, ms) {
  const buf = new ArrayBuffer(4 + 5); // header + payload
  const view = new DataView(buf);

  // header
  view.setUint8(0, 1); // version
  view.setUint8(1, 4); // type=PKT_CMD
  view.setUint16(2, 5, false); // length=payload, big endian

  // payload
  view.setUint8(4, 1); // cmd_type = 1 (set_interval)
  view.setUint32(5, ms, true); // interval (little endian)

  ws.send(buf);
}
