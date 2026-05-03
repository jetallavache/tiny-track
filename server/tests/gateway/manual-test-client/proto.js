/**
 * TinyTrack Wire Protocol - JavaScript implementation
 *
 * Frame layout (10-byte header):
 *   [magic:1][version:1][type:1][length:2][timestamp:4][checksum:1] + payload
 *
 * All multi-byte fields are big-endian (network byte order).
 */

const PROTO = {
  MAGIC: 0xaa,
  V1: 0x01,
  V2: 0x02,

  /* Packet types */
  PKT_METRICS: 0x01,
  PKT_CONFIG: 0x02,
  PKT_ALERT: 0x03,
  PKT_CMD: 0x04,
  PKT_ACK: 0x05,
  PKT_HISTORY_REQ: 0x10,
  PKT_HISTORY_RESP: 0x11,
  PKT_SUBSCRIBE: 0x12,
  PKT_RING_STATS: 0x13,
  PKT_SYS_INFO: 0x14,

  /* Commands */
  CMD_SET_INTERVAL: 0x01,
  CMD_SET_ALERTS: 0x02,
  CMD_GET_SNAPSHOT: 0x03,
  CMD_GET_RING_STATS: 0x10,
  CMD_GET_SYS_INFO: 0x11,
  CMD_START: 0x12,
  CMD_STOP: 0x13,
  CMD_AUTH: 0x14,

  /* ACK status */
  ACK_OK: 0x00,
  ACK_ERROR: 0x01,
  ACK_AUTH_FAIL: 0x02,

  /* Auth */
  PKT_AUTH_REQ: 0x15,

  /* Ring levels */
  RING_L1: 0x01,
  RING_L2: 0x02,
  RING_L3: 0x03,

  /* History flags */
  HISTORY_FLAG_LAST: 0x01,

  HEADER_SIZE: 10,
};

/* ------------------------------------------------------------------ */
/* Checksum                                                             */
/* ------------------------------------------------------------------ */

function calcChecksum(view) {
  let cs = 0;
  for (let i = 0; i < PROTO.HEADER_SIZE; i++) {
    if (i !== 9) cs ^= view.getUint8(i); /* skip checksum byte at offset 9 */
  }
  return cs;
}

/* ------------------------------------------------------------------ */
/* Parse incoming binary frame → { header, payload DataView } | null  */
/* ------------------------------------------------------------------ */

function parseFrame(buffer) {
  const view = new DataView(buffer);

  if (view.byteLength < PROTO.HEADER_SIZE) return null;
  if (view.getUint8(0) !== PROTO.MAGIC) return null;

  const version = view.getUint8(1);
  const type = view.getUint8(2);
  const length = view.getUint16(3); /* big-endian */
  const timestamp = view.getUint32(5); /* big-endian, Unix seconds */
  const checksum = view.getUint8(9);

  /* Validate checksum */
  const tmp = new DataView(buffer.slice(0, PROTO.HEADER_SIZE));
  tmp.setUint8(9, 0);
  let cs = 0;
  for (let i = 0; i < PROTO.HEADER_SIZE; i++) cs ^= tmp.getUint8(i);
  if (cs !== checksum) {
    console.warn('Frame checksum mismatch', { expected: checksum, got: cs });
    return null;
  }

  const payload = new DataView(buffer, PROTO.HEADER_SIZE, length);
  return { version, type, timestamp, payload };
}

/* ------------------------------------------------------------------ */
/* Parse tt_metrics from DataView at offset                            */
/* struct tt_metrics (52 bytes, packed, little-endian):               */
/*   timestamp:8  cpu:2  mem:2  net_rx:4  net_tx:4                    */
/*   load1:2  load5:2  load15:2  nr_running:4  nr_total:4             */
/*   du_usage:2  du_total:8  du_free:8                                 */
/* ------------------------------------------------------------------ */

function parseMetrics(view, offset = 0) {
  const LE = true; /* tt_metrics is stored little-endian (native x86) */

  /* uint64 timestamp: read as two uint32 LE and combine */
  const tsLo = view.getUint32(offset, LE);
  const tsHi = view.getUint32(offset + 4, LE);
  const timestamp = tsHi * 2 ** 32 + tsLo; /* ms since epoch */

  return {
    timestamp,
    cpu_usage: view.getUint16(offset + 8, LE) /* * 100 */,
    mem_usage: view.getUint16(offset + 10, LE) /* * 100 */,
    net_rx: view.getUint32(offset + 12, LE) /* bytes/sec */,
    net_tx: view.getUint32(offset + 16, LE) /* bytes/sec */,
    load_1min: view.getUint16(offset + 20, LE) /* * 100 */,
    load_5min: view.getUint16(offset + 22, LE) /* * 100 */,
    load_15min: view.getUint16(offset + 24, LE) /* * 100 */,
    nr_running: view.getUint32(offset + 26, LE),
    nr_total: view.getUint32(offset + 30, LE),
    du_usage: view.getUint16(offset + 34, LE) /* * 100 */,
    /* du_total_bytes at +36, du_free_bytes at +44 (uint64 LE) */
  };
}

/* ------------------------------------------------------------------ */
/* Build outgoing binary frames                                         */
/* ------------------------------------------------------------------ */

function buildHeader(version, type, payloadLen, timestamp) {
  const buf = new ArrayBuffer(PROTO.HEADER_SIZE);
  const view = new DataView(buf);
  view.setUint8(0, PROTO.MAGIC);
  view.setUint8(1, version);
  view.setUint8(2, type);
  view.setUint16(3, payloadLen);
  view.setUint32(5, timestamp ?? Math.floor(Date.now() / 1000));
  view.setUint8(9, 0); /* checksum placeholder */

  let cs = 0;
  for (let i = 0; i < PROTO.HEADER_SIZE; i++) cs ^= view.getUint8(i);
  view.setUint8(9, cs);
  return buf;
}

function buildCmd(cmdType, arg32 = 0) {
  /* PKT_CMD payload: [cmd_type:1][union:8] = 9 bytes */
  const payload = new ArrayBuffer(9);
  const pv = new DataView(payload);
  pv.setUint8(0, cmdType);
  pv.setUint32(1, arg32); /* big-endian */

  const header = buildHeader(PROTO.V1, PROTO.PKT_CMD, 9);
  return concat(header, payload);
}

function buildSubscribe(level, intervalMs = 0) {
  /* PKT_SUBSCRIBE payload: [level:1][interval_ms:4][reserved:1] = 6 bytes */
  const payload = new ArrayBuffer(6);
  const pv = new DataView(payload);
  pv.setUint8(0, level);
  pv.setUint32(1, intervalMs); /* big-endian */
  pv.setUint8(5, 0);

  const header = buildHeader(PROTO.V2, PROTO.PKT_SUBSCRIBE, 6);
  return concat(header, payload);
}

function buildHistoryReq(level, maxCount = 60, fromTs = 0, toTs = 0) {
  /* PKT_HISTORY_REQ payload: [level:1][from_ts:8][to_ts:8][max_count:2] = 19 bytes */
  const payload = new ArrayBuffer(19);
  const pv = new DataView(payload);
  pv.setUint8(0, level);
  /* from_ts / to_ts as uint64 — write as two uint32 (hi=0 for simplicity) */
  pv.setUint32(1, 0);
  pv.setUint32(5, fromTs);
  pv.setUint32(9, 0);
  pv.setUint32(13, toTs);
  pv.setUint16(17, maxCount);

  const header = buildHeader(PROTO.V2, PROTO.PKT_HISTORY_REQ, 19);
  return concat(header, payload);
}

function buildAuth(token) {
  /* PKT_CMD / CMD_AUTH payload: [cmd_type:1][token:64] = 65 bytes */
  const payload = new ArrayBuffer(65);
  const pv = new DataView(payload);
  pv.setUint8(0, PROTO.CMD_AUTH);
  const enc = new TextEncoder().encode(token.slice(0, 63));
  new Uint8Array(payload, 1, 64).set(enc);

  const header = buildHeader(PROTO.V2, PROTO.PKT_CMD, 65);
  return concat(header, payload);
}

function concat(...bufs) {
  const total = bufs.reduce((s, b) => s + b.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of bufs) {
    out.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  return out.buffer;
}

/* ------------------------------------------------------------------ */
/* Dispatch parsed frame to handler                                   */
/* ------------------------------------------------------------------ */

function dispatchFrame(frame, handlers) {
  const { type, timestamp, payload } = frame;

  switch (type) {
    case PROTO.PKT_METRICS: {
      const m = parseMetrics(payload, 0);
      handlers.onMetrics?.(m);
      break;
    }
    case PROTO.PKT_CONFIG: {
      const intervalMs = payload.getUint32(0);
      const alertsEnabled = payload.getUint8(4);
      handlers.onConfig?.({ intervalMs, alertsEnabled });
      break;
    }
    case PROTO.PKT_ACK: {
      const cmdType = payload.getUint8(0);
      const status = payload.getUint8(1);
      handlers.onAck?.({ cmdType, status, ok: status === PROTO.ACK_OK });
      break;
    }
    case PROTO.PKT_ALERT: {
      const level = payload.getUint8(0);
      const message = new TextDecoder()
        .decode(new Uint8Array(payload.buffer, payload.byteOffset + 1, 128))
        .replace(/\0.*$/, '');
      handlers.onAlert?.({ level, message });
      break;
    }
    case PROTO.PKT_HISTORY_RESP: {
      const level = payload.getUint8(0);
      const count = payload.getUint16(1);
      const flags = payload.getUint8(3);
      const isLast = (flags & PROTO.HISTORY_FLAG_LAST) !== 0;
      const samples = [];
      for (let i = 0; i < count; i++) samples.push(parseMetrics(payload, 4 + i * 52));
      handlers.onHistoryResp?.({ level, samples, isLast });
      break;
    }
    case PROTO.PKT_RING_STATS: {
      const parseRingStat = (offset) => ({
        level: payload.getUint8(offset),
        capacity: payload.getUint32(offset + 1),
        head: payload.getUint32(offset + 5),
        filled: payload.getUint32(offset + 9),
      });
      handlers.onRingStats?.({
        l1: parseRingStat(0),
        l2: parseRingStat(25),
        l3: parseRingStat(50),
      });
      break;
    }
    case PROTO.PKT_AUTH_REQ: {
      handlers.onAuthReq?.();
      break;
    }
    case PROTO.PKT_SYS_INFO: {      const dec = new TextDecoder();
      const hostname = dec.decode(new Uint8Array(payload.buffer, payload.byteOffset, 64)).replace(/\0.*$/, '');
      const os_type = dec.decode(new Uint8Array(payload.buffer, payload.byteOffset + 64, 64)).replace(/\0.*$/, '');
      /* uptime_sec: uint64 BE at offset 128 */
      const uptimeHi = payload.getUint32(128);
      const uptimeLo = payload.getUint32(132);
      const uptime_sec = uptimeHi * 2 ** 32 + uptimeLo;
      handlers.onSysInfo?.({
        hostname,
        os_type,
        uptime_sec,
        slots_l1: payload.getUint32(136),
        slots_l2: payload.getUint32(140),
        slots_l3: payload.getUint32(144),
        interval_ms: payload.getUint32(148),
        agg_l2_ms: payload.getUint32(152),
        agg_l3_ms: payload.getUint32(156),
      });
      break;
    }
    default:
      console.warn('Unknown packet type:', type.toString(16));
  }
}

if (typeof module !== 'undefined')
  module.exports = { PROTO, parseFrame, parseMetrics, buildCmd, buildSubscribe, buildHistoryReq, buildAuth, dispatchFrame };
