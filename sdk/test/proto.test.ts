import { describe, it, expect } from 'vitest';
import {
  parseHeader,
  parseMetrics,
  parseConfig,
  parseAck,
  parseStats,
  parseHistoryResp,
  buildCmd,
  buildHistoryReq,
  buildSubscribe,
  PROTO_MAGIC,
  HEADER_SIZE,
  PKT_METRICS,
  PKT_CONFIG,
  PKT_ACK,
  PKT_RING_STATS,
  PKT_HISTORY_RESP,
  CMD_GET_SNAPSHOT,
  CMD_GET_RING_STATS,
  CMD_SET_INTERVAL,
  RING_L1,
  RING_L2,
  RING_L3,
  ACK_OK,
} from '../src/proto.js';

// ---------------------------------------------------------------------------
// Helpers to build test frames
// ---------------------------------------------------------------------------

function makeHeader(type: number, payloadLen: number, version = 0x01): DataView {
  const buf = new ArrayBuffer(HEADER_SIZE + payloadLen);
  const v = new DataView(buf);
  v.setUint8(0, PROTO_MAGIC);
  v.setUint8(1, version);
  v.setUint8(2, type);
  v.setUint16(3, payloadLen, false);
  v.setUint32(5, 1711929600, false); // fixed ts
  // checksum
  let cs = 0;
  for (let i = 0; i < 9; i++) cs ^= v.getUint8(i);
  v.setUint8(9, cs);
  return v;
}

function makeMetricsPayload(): ArrayBuffer {
  const buf = new ArrayBuffer(52);
  const v = new DataView(buf);
  // timestamp = 1711929600000 ms
  v.setUint32(0, 0, true); // lo
  v.setUint32(4, 0x18f5e100, true); // hi — gives a large ms value
  v.setUint16(8, 3456, true); // cpu 34.56%
  v.setUint16(10, 6789, true); // mem 67.89%
  v.setUint32(12, 1024, true); // netRx
  v.setUint32(16, 512, true); // netTx
  v.setUint16(20, 150, true); // load1
  v.setUint16(22, 120, true); // load5
  v.setUint16(24, 100, true); // load15
  v.setUint32(26, 3, true); // nrRunning
  v.setUint32(30, 120, true); // nrTotal
  v.setUint16(34, 2500, true); // duUsage 25%
  v.setUint32(36, 0, true); // duTotal lo
  v.setUint32(40, 1, true); // duTotal hi → 4GB
  v.setUint32(44, 0, true); // duFree lo
  v.setUint32(48, 0, true); // duFree hi
  return buf;
}

// ---------------------------------------------------------------------------
// parseHeader
// ---------------------------------------------------------------------------

describe('parseHeader', () => {
  it('returns null for empty buffer', () => {
    expect(parseHeader(new ArrayBuffer(0))).toBeNull();
  });

  it('returns null for wrong magic', () => {
    const buf = new ArrayBuffer(HEADER_SIZE);
    new DataView(buf).setUint8(0, 0x00);
    expect(parseHeader(buf)).toBeNull();
  });

  it('parses a valid header', () => {
    const h = makeHeader(PKT_METRICS, 52);
    const frame = parseHeader(h.buffer);
    expect(frame).not.toBeNull();
    expect(frame!.type).toBe(PKT_METRICS);
    expect(frame!.version).toBe(0x01);
    expect(frame!.payload.byteLength).toBe(52);
  });

  it('returns null when payload is truncated', () => {
    const buf = new ArrayBuffer(HEADER_SIZE + 10); // claims 52 bytes but only 10
    const v = new DataView(buf);
    v.setUint8(0, PROTO_MAGIC);
    v.setUint16(3, 52, false);
    expect(parseHeader(buf)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseMetrics
// ---------------------------------------------------------------------------

describe('parseMetrics', () => {
  it('parses all fields correctly', () => {
    const payload = makeMetricsPayload();
    const m = parseMetrics(new DataView(payload));
    expect(m.cpu).toBe(3456);
    expect(m.mem).toBe(6789);
    expect(m.netRx).toBe(1024);
    expect(m.netTx).toBe(512);
    expect(m.load1).toBe(150);
    expect(m.nrRunning).toBe(3);
    expect(m.nrTotal).toBe(120);
    expect(m.duUsage).toBe(2500);
  });

  it('parses a full PKT_METRICS frame', () => {
    const h = makeHeader(PKT_METRICS, 52);
    const payload = makeMetricsPayload();
    // copy payload into frame buffer
    const frame = new Uint8Array(h.buffer);
    new Uint8Array(payload).forEach((b, i) => {
      frame[HEADER_SIZE + i] = b;
    });
    const parsed = parseHeader(h.buffer);
    expect(parsed).not.toBeNull();
    const m = parseMetrics(parsed!.payload);
    expect(m.cpu).toBe(3456);
  });
});

// ---------------------------------------------------------------------------
// parseConfig
// ---------------------------------------------------------------------------

describe('parseConfig', () => {
  it('parses interval and alerts flag', () => {
    const buf = new ArrayBuffer(5);
    const v = new DataView(buf);
    v.setUint32(0, 1000, false);
    v.setUint8(4, 1);
    const c = parseConfig(v);
    expect(c.intervalMs).toBe(1000);
    expect(c.alertsEnabled).toBe(true);
  });

  it('alerts disabled when byte is 0', () => {
    const buf = new ArrayBuffer(5);
    const v = new DataView(buf);
    v.setUint32(0, 500, false);
    v.setUint8(4, 0);
    expect(parseConfig(v).alertsEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseAck
// ---------------------------------------------------------------------------

describe('parseAck', () => {
  it('parses cmd_type and status', () => {
    const buf = new ArrayBuffer(2);
    const v = new DataView(buf);
    v.setUint8(0, CMD_GET_SNAPSHOT);
    v.setUint8(1, ACK_OK);
    const a = parseAck(v);
    expect(a.cmdType).toBe(CMD_GET_SNAPSHOT);
    expect(a.status).toBe(ACK_OK);
  });
});

// ---------------------------------------------------------------------------
// parseStats
// ---------------------------------------------------------------------------

describe('parseStats', () => {
  it('parses three ring stats', () => {
    const buf = new ArrayBuffer(87); // 3 × 29
    const v = new DataView(buf);
    // L1 at offset 0
    v.setUint8(0, RING_L1);
    v.setUint32(1, 3600, false); // capacity
    v.setUint32(5, 10, false); // head
    v.setUint32(9, 10, false); // filled
    // firstTs / lastTs = 0 (already zeroed)
    // L2 at offset 29
    v.setUint8(29, RING_L2);
    v.setUint32(30, 1440, false);
    // L3 at offset 58
    v.setUint8(58, RING_L3);
    v.setUint32(59, 168, false);

    const s = parseStats(v);
    expect(s.l1.level).toBe(RING_L1);
    expect(s.l1.capacity).toBe(3600);
    expect(s.l1.filled).toBe(10);
    expect(s.l2.level).toBe(RING_L2);
    expect(s.l2.capacity).toBe(1440);
    expect(s.l3.level).toBe(RING_L3);
    expect(s.l3.capacity).toBe(168);
  });
});

// ---------------------------------------------------------------------------
// parseHistoryResp
// ---------------------------------------------------------------------------

describe('parseHistoryResp', () => {
  it('parses header and samples', () => {
    const count = 2;
    const buf = new ArrayBuffer(4 + count * 52);
    const v = new DataView(buf);
    v.setUint8(0, RING_L1);
    v.setUint16(1, count, false);
    v.setUint8(3, 0x01); // HISTORY_FLAG_LAST

    // Write two minimal metrics payloads
    for (let i = 0; i < count; i++) {
      const off = 4 + i * 52;
      new DataView(buf, off, 52).setUint16(8, 1000 + i, true); // cpu
    }

    const r = parseHistoryResp(v);
    expect(r.level).toBe(RING_L1);
    expect(r.count).toBe(count);
    expect(r.last).toBe(true);
    expect(r.samples).toHaveLength(count);
    expect(r.samples[0].cpu).toBe(1000);
    expect(r.samples[1].cpu).toBe(1001);
  });
});

// ---------------------------------------------------------------------------
// Command builders
// ---------------------------------------------------------------------------

describe('buildCmd', () => {
  it('builds a valid CMD_GET_SNAPSHOT frame', () => {
    const buf = buildCmd(CMD_GET_SNAPSHOT);
    const frame = parseHeader(buf);
    expect(frame).not.toBeNull();
    expect(frame!.type).toBe(0x04); // PKT_CMD
    expect(frame!.payload.getUint8(0)).toBe(CMD_GET_SNAPSHOT);
  });

  it('builds CMD_SET_INTERVAL with arg', () => {
    const buf = buildCmd(CMD_SET_INTERVAL, 5000);
    const frame = parseHeader(buf);
    expect(frame!.payload.getUint8(0)).toBe(CMD_SET_INTERVAL);
    expect(frame!.payload.getUint32(1, false)).toBe(5000);
  });
});

describe('buildHistoryReq', () => {
  it('builds a valid PKT_HISTORY_REQ frame', () => {
    const buf = buildHistoryReq(RING_L2, 30);
    const frame = parseHeader(buf);
    expect(frame).not.toBeNull();
    expect(frame!.type).toBe(0x10); // PKT_HISTORY_REQ
    expect(frame!.payload.getUint8(0)).toBe(RING_L2);
    // max_count at offset 17 (1 + 8 + 8)
    expect(frame!.payload.getUint16(17, false)).toBe(30);
  });
});

describe('buildSubscribe', () => {
  it('builds a valid PKT_SUBSCRIBE frame', () => {
    const buf = buildSubscribe(RING_L3, 10000);
    const frame = parseHeader(buf);
    expect(frame).not.toBeNull();
    expect(frame!.type).toBe(0x12); // PKT_SUBSCRIBE
    expect(frame!.payload.getUint8(0)).toBe(RING_L3);
    expect(frame!.payload.getUint32(1, false)).toBe(10000);
  });
});
