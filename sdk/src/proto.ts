/**
 * TinyTrack binary protocol parser (v1 + v2).
 *
 * Wire format (big-endian):
 *   [magic:1][version:1][type:1][length:2][timestamp:4][checksum:1] + payload
 *
 * tt_metrics payload (52 bytes, little-endian packed struct):
 *   timestamp:8  cpu:2  mem:2  net_rx:4  net_tx:4
 *   load1:2  load5:2  load15:2  nr_running:4  nr_total:4
 *   du_usage:2  du_total:8  du_free:8
 */

export const PROTO_MAGIC = 0xaa;
export const HEADER_SIZE = 10;

// Packet types
export const PKT_METRICS = 0x01;
export const PKT_CONFIG = 0x02;
export const PKT_ALERT = 0x03;
export const PKT_CMD = 0x04;
export const PKT_ACK = 0x05;
export const PKT_HISTORY_REQ = 0x10;
export const PKT_HISTORY_RESP = 0x11;
export const PKT_SUBSCRIBE = 0x12;
export const PKT_RING_STATS = 0x13;
export const PKT_SYS_INFO = 0x14;

// Ring levels
export const RING_L1 = 0x01;
export const RING_L2 = 0x02;
export const RING_L3 = 0x03;

// Commands
export const CMD_SET_INTERVAL = 0x01;
export const CMD_SET_ALERTS = 0x02;
export const CMD_GET_SNAPSHOT = 0x03;
export const CMD_GET_RING_STATS = 0x10;
export const CMD_GET_SYS_INFO = 0x11;
export const CMD_START = 0x12;
export const CMD_STOP = 0x13;

export const ACK_OK = 0x00;
export const ACK_ERROR = 0x01;

export interface TtMetrics {
  timestamp: number; // ms since epoch
  cpu: number; // 0..10000 (percent * 100)
  mem: number; // 0..10000
  netRx: number; // bytes/sec
  netTx: number; // bytes/sec
  load1: number; // load avg * 100
  load5: number;
  load15: number;
  nrRunning: number;
  nrTotal: number;
  duUsage: number; // 0..10000
  duTotal: number; // bytes
  duFree: number; // bytes
}

export interface TtConfig {
  intervalMs: number;
  alertsEnabled: boolean;
}

export interface TtAck {
  cmdType: number;
  status: number; // ACK_OK | ACK_ERROR
}

export interface TtRingStat {
  level: number;
  capacity: number;
  head: number;
  filled: number;
  firstTs: number;
  lastTs: number;
}

export interface TtStats {
  l1: TtRingStat;
  l2: TtRingStat;
  l3: TtRingStat;
}

export interface TtSysInfo {
  hostname: string;
  osType: string;
  uptimeSec: number;
  slotsL1: number;
  slotsL2: number;
  slotsL3: number;
  intervalMs: number;
  aggL2Ms: number;
  aggL3Ms: number;
}

export interface TtHistoryResp {
  level: number;
  count: number;
  last: boolean;
  samples: TtMetrics[];
}

export interface TtFrame {
  type: number;
  version: number;
  timestamp: number;
  payload: DataView;
}

/** Parse the 10-byte header. Returns null if buffer is too short or magic is wrong. */
export function parseHeader(buf: ArrayBuffer, offset = 0): TtFrame | null {
  if (buf.byteLength - offset < HEADER_SIZE) return null;
  const v = new DataView(buf, offset);
  if (v.getUint8(0) !== PROTO_MAGIC) return null;
  const version = v.getUint8(1);
  const type = v.getUint8(2);
  const length = v.getUint16(3, false); // big-endian
  const timestamp = v.getUint32(5, false);
  if (buf.byteLength - offset < HEADER_SIZE + length) return null;
  return {
    type,
    version,
    timestamp,
    payload: new DataView(buf, offset + HEADER_SIZE, length),
  };
}

/** Parse PKT_METRICS payload (52 bytes, little-endian). */
export function parseMetrics(p: DataView): TtMetrics {
  // uint64 LE: lo word at offset 0, hi word at offset 4
  const tsLo = p.getUint32(0, true);
  const tsHi = p.getUint32(4, true);
  const timestamp = tsHi * 0x100000000 + tsLo;
  return {
    timestamp,
    cpu: p.getUint16(8, true),
    mem: p.getUint16(10, true),
    netRx: p.getUint32(12, true),
    netTx: p.getUint32(16, true),
    load1: p.getUint16(20, true),
    load5: p.getUint16(22, true),
    load15: p.getUint16(24, true),
    nrRunning: p.getUint32(26, true),
    nrTotal: p.getUint32(30, true),
    duUsage: p.getUint16(34, true),
    duTotal: readUint64LE(p, 36),
    duFree: readUint64LE(p, 44),
  };
}

/** Parse PKT_CONFIG payload (5 bytes). */
export function parseConfig(p: DataView): TtConfig {
  return {
    intervalMs: p.getUint32(0, false),
    alertsEnabled: p.getUint8(4) !== 0,
  };
}

/** Parse PKT_ACK payload (2 bytes). */
export function parseAck(p: DataView): TtAck {
  return { cmdType: p.getUint8(0), status: p.getUint8(1) };
}

/** Parse PKT_STATS payload (75 bytes = 3 × 25). */
export function parseStats(p: DataView): TtStats {
  return {
    l1: parseRingStat(p, 0),
    l2: parseRingStat(p, 29),
    l3: parseRingStat(p, 58),
  };
}

/** Parse PKT_HISTORY_RESP payload. */
export function parseHistoryResp(p: DataView): TtHistoryResp {
  const level = p.getUint8(0);
  const count = p.getUint16(1, false);
  const flags = p.getUint8(3);
  const samples: TtMetrics[] = [];
  for (let i = 0; i < count; i++) {
    const off = 4 + i * 52;
    samples.push(parseMetrics(new DataView(p.buffer, p.byteOffset + off, 52)));
  }
  return { level, count, last: (flags & 0x01) !== 0, samples };
}

/** Parse PKT_SYS_INFO payload (168 bytes). */
export function parseSysInfo(p: DataView): TtSysInfo {
  const dec = new TextDecoder();
  const hostname = dec.decode(new Uint8Array(p.buffer, p.byteOffset, 64)).replace(/\0.*/, '');
  const osType = dec.decode(new Uint8Array(p.buffer, p.byteOffset + 64, 64)).replace(/\0.*/, '');
  return {
    hostname,
    osType,
    uptimeSec: readUint64BE(p, 128), // server: htobe64
    slotsL1: p.getUint32(136, false), // server: htonl (BE)
    slotsL2: p.getUint32(140, false),
    slotsL3: p.getUint32(144, false),
    intervalMs: p.getUint32(148, false),
    aggL2Ms: p.getUint32(152, false),
    aggL3Ms: p.getUint32(156, false),
  };
}

// ---------------------------------------------------------------------------
// Command builders
// ---------------------------------------------------------------------------

export function buildCmd(cmdType: number, arg = 0): ArrayBuffer {
  const buf = new ArrayBuffer(HEADER_SIZE + 9);
  const h = new DataView(buf);
  const ts = Math.floor(Date.now() / 1000);
  h.setUint8(0, PROTO_MAGIC);
  h.setUint8(1, 0x01); // v1
  h.setUint8(2, PKT_CMD);
  h.setUint16(3, 9, false);
  h.setUint32(5, ts, false);
  h.setUint8(9, calcChecksum(h));
  // payload
  h.setUint8(10, cmdType);
  h.setUint32(11, arg, false);
  return buf;
}

export function buildHistoryReq(level: number, maxCount = 0, fromTs = 0, toTs = 0): ArrayBuffer {
  const buf = new ArrayBuffer(HEADER_SIZE + 19);
  const h = new DataView(buf);
  const ts = Math.floor(Date.now() / 1000);
  h.setUint8(0, PROTO_MAGIC);
  h.setUint8(1, 0x02); // v2
  h.setUint8(2, PKT_HISTORY_REQ);
  h.setUint16(3, 19, false);
  h.setUint32(5, ts, false);
  h.setUint8(9, calcChecksum(h));
  // payload: level(1) from_ts(8) to_ts(8) max_count(2)
  h.setUint8(10, level);
  writeUint64BE(h, 11, fromTs);
  writeUint64BE(h, 19, toTs);
  h.setUint16(27, maxCount, false);
  return buf;
}

export function buildSubscribe(level: number, intervalMs = 0): ArrayBuffer {
  const buf = new ArrayBuffer(HEADER_SIZE + 6);
  const h = new DataView(buf);
  const ts = Math.floor(Date.now() / 1000);
  h.setUint8(0, PROTO_MAGIC);
  h.setUint8(1, 0x02);
  h.setUint8(2, PKT_SUBSCRIBE);
  h.setUint16(3, 6, false);
  h.setUint32(5, ts, false);
  h.setUint8(9, calcChecksum(h));
  h.setUint8(10, level);
  h.setUint32(11, intervalMs, false);
  h.setUint8(15, 0);
  return buf;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcChecksum(h: DataView): number {
  let cs = 0;
  for (let i = 0; i < 9; i++) cs ^= h.getUint8(i);
  return cs;
}

function parseRingStat(p: DataView, off: number): TtRingStat {
  return {
    level: p.getUint8(off),
    capacity: p.getUint32(off + 1, false), // htonl (BE)
    head: p.getUint32(off + 5, false), // htonl (BE)
    filled: p.getUint32(off + 9, false), // htonl (BE)
    firstTs: readUint64LE(p, off + 13), // no hton, native LE
    lastTs: readUint64LE(p, off + 21), // no hton, native LE
  };
}

function readUint64LE(v: DataView, off: number): number {
  const lo = v.getUint32(off, true);
  const hi = v.getUint32(off + 4, true);
  return hi * 0x100000000 + lo;
}

function readUint64BE(v: DataView, off: number): number {
  const hi = v.getUint32(off, false);
  const lo = v.getUint32(off + 4, false);
  return hi * 0x100000000 + lo;
}

function writeUint64BE(v: DataView, off: number, val: number): void {
  const hi = Math.floor(val / 0x100000000);
  const lo = val >>> 0;
  v.setUint32(off, hi, false);
  v.setUint32(off + 4, lo, false);
}
