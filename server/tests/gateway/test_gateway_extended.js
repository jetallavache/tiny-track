#!/usr/bin/env node
/**
 * TinyTrack WebSocket integration tests — extended suite
 *
 * Usage: node test_gateway_extended.js [ws://host:port]
 * Exit:  0 = all passed, 1 = failures
 */

'use strict';

const { WebSocket } = require('ws');
const proto = require('./manual-test-client/proto.js');

const URL = process.argv[2] || 'ws://127.0.0.1:4028/websocket';
const P = proto.PROTO;

let passed = 0, failed = 0;

function ok(name, cond, detail) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

/* ------------------------------------------------------------------ */
/* Low-level frame builders                                             */
/* ------------------------------------------------------------------ */

function buildHeaderBuf(version, type, payloadLen) {
  const buf = new ArrayBuffer(P.HEADER_SIZE);
  const v = new DataView(buf);
  v.setUint8(0, P.MAGIC);
  v.setUint8(1, version);
  v.setUint8(2, type);
  v.setUint16(3, payloadLen);
  v.setUint32(5, Math.floor(Date.now() / 1000));
  v.setUint8(9, 0);
  let cs = 0;
  for (let i = 0; i < P.HEADER_SIZE; i++) cs ^= v.getUint8(i);
  v.setUint8(9, cs);
  return buf;
}

function concatBufs(...bufs) {
  const total = bufs.reduce((s, b) => s + b.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of bufs) { out.set(new Uint8Array(b), off); off += b.byteLength; }
  return out.buffer;
}

/* Build a PKT_CMD with arbitrary 8-byte union payload */
function buildRawCmd(cmdType, unionBytes) {
  const payload = new ArrayBuffer(9);
  const pv = new DataView(payload);
  pv.setUint8(0, cmdType);
  for (let i = 0; i < 8; i++) pv.setUint8(1 + i, unionBytes[i] ?? 0);
  const hdr = buildHeaderBuf(P.V1, P.PKT_CMD, 9);
  return concatBufs(hdr, payload);
}

/* Open a WS, wait for first PKT_CONFIG, then hand off to cb(ws) */
function withConnection(label, cb) {
  return new Promise((resolve) => {
    const ws = new WebSocket(URL, { handshakeTimeout: 5000 });
    const timer = setTimeout(() => {
      ok(`${label}: connect`, false, 'timeout');
      ws.terminate();
      resolve();
    }, 8000);

    ws.on('error', (e) => {
      ok(`${label}: connect`, false, e.message);
      clearTimeout(timer);
      resolve();
    });

    ws.on('open', () => {
      /* wait for PKT_CONFIG before handing off */
      ws.once('message', (data) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const frame = proto.parseFrame(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
        if (!frame || frame.type !== P.PKT_CONFIG) {
          ok(`${label}: initial PKT_CONFIG`, false, `got type ${frame?.type}`);
          clearTimeout(timer);
          ws.terminate();
          resolve();
          return;
        }
        cb(ws, frame, () => { clearTimeout(timer); ws.terminate(); resolve(); });
      });
    });
  });
}

/* Collect frames until predicate returns true or timeout */
function collectUntil(ws, predicate, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const frames = [];
    const t = setTimeout(() => resolve(frames), timeoutMs);
    ws.on('message', function handler(data) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const frame = proto.parseFrame(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      if (!frame) return;
      frames.push(frame);
      if (predicate(frame, frames)) {
        clearTimeout(t);
        ws.off('message', handler);
        resolve(frames);
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Test 1: CMD_SET_INTERVAL — server must ACK and change push rate     */
/* ------------------------------------------------------------------ */

async function testSetInterval() {
  console.log('\n[1] CMD_SET_INTERVAL');
  await withConnection('set_interval', async (ws, _cfg, done) => {
    const NEW_INTERVAL = 2000;
    const payload = new ArrayBuffer(9);
    const pv = new DataView(payload);
    pv.setUint8(0, P.CMD_SET_INTERVAL);
    pv.setUint32(1, NEW_INTERVAL);
    const hdr = proto.buildCmd(P.CMD_SET_INTERVAL, NEW_INTERVAL);
    ws.send(hdr);

    const frames = await collectUntil(ws,
      (f) => f.type === P.PKT_ACK, 3000);

    const ack = frames.find(f => f.type === P.PKT_ACK);
    ok('PKT_ACK received for CMD_SET_INTERVAL', !!ack);
    if (ack) {
      ok('ACK cmd_type echoes CMD_SET_INTERVAL',
         ack.payload.getUint8(0) === P.CMD_SET_INTERVAL,
         `got ${ack.payload.getUint8(0)}`);
      ok('ACK status OK',
         ack.payload.getUint8(1) === P.ACK_OK,
         `got ${ack.payload.getUint8(1)}`);
    }
    done();
  });
}

/* ------------------------------------------------------------------ */
/* Test 2: CMD_SET_ALERTS — toggle alerts, expect ACK                  */
/* ------------------------------------------------------------------ */

async function testSetAlerts() {
  console.log('\n[2] CMD_SET_ALERTS');
  await withConnection('set_alerts', async (ws, _cfg, done) => {
    ws.send(buildRawCmd(P.CMD_SET_ALERTS, new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0])));

    const frames = await collectUntil(ws, (f) => f.type === P.PKT_ACK, 3000);
    const ack = frames.find(f => f.type === P.PKT_ACK);
    ok('PKT_ACK received for CMD_SET_ALERTS', !!ack);
    if (ack) {
      ok('ACK cmd_type echoes CMD_SET_ALERTS',
         ack.payload.getUint8(0) === P.CMD_SET_ALERTS,
         `got ${ack.payload.getUint8(0)}`);
    }
    done();
  });
}

/* ------------------------------------------------------------------ */
/* Test 3: History L2 and L3                                           */
/* ------------------------------------------------------------------ */

async function testHistoryLevels() {
  console.log('\n[3] PKT_HISTORY_RESP for L2 and L3');
  await withConnection('history_l2_l3', async (ws, _cfg, done) => {
    ws.send(proto.buildHistoryReq(P.RING_L2, 5, 0, 0));
    ws.send(proto.buildHistoryReq(P.RING_L3, 5, 0, 0));

    let gotL2 = false;
    const frames = await collectUntil(ws,
      (_f, all) => {
        for (const f of all) {
          if (f.type === P.PKT_HISTORY_RESP && f.payload.getUint8(0) === P.RING_L2)
            gotL2 = true;
        }
        return gotL2;
      }, 5000);

    ok('PKT_HISTORY_RESP for L2 received', gotL2);

    /* Validate L2 response structure */
    for (const f of frames.filter(f => f.type === P.PKT_HISTORY_RESP)) {
      const level = f.payload.getUint8(0);
      const count = f.payload.getUint16(1);
      const flags = f.payload.getUint8(3);
      ok(`history L${level} payload size matches count=${count}`,
         f.payload.byteLength >= 4 + count * 52,
         `got ${f.payload.byteLength}`);
      ok(`history L${level} LAST flag set`,
         (flags & P.HISTORY_FLAG_LAST) !== 0,
         `flags=0x${flags.toString(16)}`);
    }

    /* L3 aggregates every 60s — may have no data yet, skip if absent */
    const gotL3 = frames.some(f => f.type === P.PKT_HISTORY_RESP && f.payload.getUint8(0) === P.RING_L3);
    if (gotL3) ok('PKT_HISTORY_RESP for L3 received', true);
    else console.log('  - L3 skipped (no data yet — aggregates every 60s)');

    done();
  });
}

/* ------------------------------------------------------------------ */
/* Test 4: PKT_SUBSCRIBE — server ACKs and sends PKT_METRICS           */
/* ------------------------------------------------------------------ */

async function testSubscribe() {
  console.log('\n[4] PKT_SUBSCRIBE');
  await withConnection('subscribe', async (ws, _cfg, done) => {
    ws.send(proto.buildSubscribe(P.RING_L1, 500));

    let gotAck = false, gotMetrics = false;
    await collectUntil(ws,
      (f, all) => {
        if (f.type === P.PKT_ACK) gotAck = true;
        if (f.type === P.PKT_METRICS) gotMetrics = true;
        return gotAck && gotMetrics;
      }, 5000);

    ok('PKT_ACK for PKT_SUBSCRIBE', gotAck);
    ok('PKT_METRICS received after subscribe', gotMetrics);
    done();
  });
}

/* ------------------------------------------------------------------ */
/* Test 5: Malformed frame — bad magic, server must not crash          */
/* ------------------------------------------------------------------ */

async function testMalformedFrame() {
  console.log('\n[5] Malformed frame resilience');
  await withConnection('malformed', async (ws, _cfg, done) => {
    /* Send garbage */
    ws.send(Buffer.from([0xFF, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));

    /* Server should still respond to a valid CMD_GET_SNAPSHOT */
    ws.send(proto.buildCmd(P.CMD_GET_SNAPSHOT));

    const frames = await collectUntil(ws,
      (f) => f.type === P.PKT_METRICS || f.type === P.PKT_ACK, 4000);

    const alive = frames.some(f => f.type === P.PKT_METRICS || f.type === P.PKT_ACK);
    ok('server alive after malformed frame', alive);
    done();
  });
}

/* ------------------------------------------------------------------ */
/* Test 6: Bad checksum — server must not crash                        */
/* ------------------------------------------------------------------ */

async function testBadChecksum() {
  console.log('\n[6] Bad checksum resilience');
  await withConnection('bad_checksum', async (ws, _cfg, done) => {
    /* Build valid CMD_GET_SNAPSHOT then flip checksum byte */
    const valid = proto.buildCmd(P.CMD_GET_SNAPSHOT);
    const corrupt = valid.slice(0);
    const view = new DataView(corrupt);
    view.setUint8(9, view.getUint8(9) ^ 0xFF); /* flip all bits */
    ws.send(corrupt);

    ws.send(proto.buildCmd(P.CMD_GET_SNAPSHOT));

    const frames = await collectUntil(ws,
      (f) => f.type === P.PKT_METRICS || f.type === P.PKT_ACK, 4000);

    ok('server alive after bad checksum', frames.some(
      f => f.type === P.PKT_METRICS || f.type === P.PKT_ACK));
    done();
  });
}

/* ------------------------------------------------------------------ */
/* Test 7: Concurrent clients — both receive PKT_METRICS               */
/* ------------------------------------------------------------------ */

async function testConcurrentClients() {
  console.log('\n[7] Concurrent clients');

  const results = await Promise.all([0, 1].map((id) =>
    new Promise((resolve) => {
      const ws = new WebSocket(URL, { handshakeTimeout: 5000 });
      const t = setTimeout(() => { ws.terminate(); resolve(false); }, 8000);

      ws.on('error', () => { clearTimeout(t); resolve(false); });
      ws.on('message', (data) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const frame = proto.parseFrame(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
        if (frame?.type === P.PKT_METRICS) {
          clearTimeout(t);
          ws.terminate();
          resolve(true);
        }
      });
      ws.on('open', () => ws.send(proto.buildCmd(P.CMD_GET_SNAPSHOT)));
    })
  ));

  ok('client 0 received PKT_METRICS', results[0]);
  ok('client 1 received PKT_METRICS', results[1]);
}

/* ------------------------------------------------------------------ */
/* Test 8: PKT_STATS content validation                                 */
/* tt_proto_ring_stat: level:1 capacity:4 head:4 filled:4              */
/*                     first_ts:8 last_ts:8 = 29 bytes (LE)            */
/* ------------------------------------------------------------------ */

const RING_STAT_SIZE = 29;

function parseRingStat(payload, off) {
  return {
    level:    payload.getUint8(off),
    capacity: payload.getUint32(off + 1,  false), /* BE (htonl) */
    head:     payload.getUint32(off + 5,  false),
    filled:   payload.getUint32(off + 9,  false),
  };
}

async function testStatsContent() {
  console.log('\n[8] PKT_STATS content validation');
  await withConnection('stats_content', async (ws, _cfg, done) => {
    ws.send(proto.buildCmd(P.CMD_GET_STATS));

    const frames = await collectUntil(ws, (f) => f.type === P.PKT_STATS, 4000);
    const stats = frames.find(f => f.type === P.PKT_STATS);

    ok('PKT_STATS received', !!stats);
    if (stats) {
      ok('PKT_STATS size = 87', stats.payload.byteLength === RING_STAT_SIZE * 3,
         `got ${stats.payload.byteLength}`);
      const l1 = parseRingStat(stats.payload, 0);
      const l2 = parseRingStat(stats.payload, RING_STAT_SIZE);
      const l3 = parseRingStat(stats.payload, RING_STAT_SIZE * 2);

      ok('stats L1 level = 1', l1.level === P.RING_L1, `got ${l1.level}`);
      ok('stats L2 level = 2', l2.level === P.RING_L2, `got ${l2.level}`);
      ok('stats L3 level = 3', l3.level === P.RING_L3, `got ${l3.level}`);
      ok('stats L1 capacity > 0', l1.capacity > 0, `got ${l1.capacity}`);
      ok('stats L1 head <= capacity', l1.head <= l1.capacity,
         `head=${l1.head} cap=${l1.capacity}`);
      ok('stats L1 filled <= capacity', l1.filled <= l1.capacity,
         `filled=${l1.filled} cap=${l1.capacity}`);
    }
    done();
  });
}

/* ------------------------------------------------------------------ */
/* Test 9: Metrics field ranges                                         */
/* tt_metrics is little-endian (native x86 packed struct)              */
/* ------------------------------------------------------------------ */

function parseMetricsLE(payload, offset = 0) {
  const tsLo = payload.getUint32(offset,     true);
  const tsHi = payload.getUint32(offset + 4, true);
  return {
    timestamp:  tsHi * 2**32 + tsLo,
    cpu_usage:  payload.getUint16(offset + 8,  true), /* * 100 */
    mem_usage:  payload.getUint16(offset + 10, true),
    net_rx:     payload.getUint32(offset + 12, true),
    net_tx:     payload.getUint32(offset + 16, true),
    load_1min:  payload.getUint16(offset + 20, true),
    nr_running: payload.getUint32(offset + 26, true),
    nr_total:   payload.getUint32(offset + 30, true),
  };
}

async function testMetricsRanges() {
  console.log('\n[9] PKT_METRICS field ranges');
  await withConnection('metrics_ranges', async (ws, _cfg, done) => {
    ws.send(proto.buildCmd(P.CMD_GET_SNAPSHOT));

    const frames = await collectUntil(ws, (f) => f.type === P.PKT_METRICS, 4000);
    const mf = frames.find(f => f.type === P.PKT_METRICS);

    ok('PKT_METRICS received', !!mf);
    if (mf) {
      const m = parseMetricsLE(mf.payload);
      ok('cpu_usage in [0..10000]',
         m.cpu_usage >= 0 && m.cpu_usage <= 10000, `got ${m.cpu_usage}`);
      ok('mem_usage in [0..10000]',
         m.mem_usage >= 0 && m.mem_usage <= 10000, `got ${m.mem_usage}`);
      ok('load_1min >= 0', m.load_1min >= 0, `got ${m.load_1min}`);
      ok('nr_total > 0', m.nr_total > 0, `got ${m.nr_total}`);
      ok('nr_running <= nr_total',
         m.nr_running <= m.nr_total,
         `running=${m.nr_running} total=${m.nr_total}`);
      ok('timestamp within last 60s',
         Math.abs(Date.now() - m.timestamp) < 60000,
         `delta=${Math.abs(Date.now() - m.timestamp)}ms`);
    }
    done();
  });
}

/* ------------------------------------------------------------------ */
/* Entry point                                                          */
/* ------------------------------------------------------------------ */

(async () => {
  console.log(`\nTinyTrack Gateway Integration Tests — Extended`);
  console.log(`Target: ${URL}\n`);

  await testSetInterval();
  await testSetAlerts();
  await testHistoryLevels();
  await testSubscribe();
  await testMalformedFrame();
  await testBadChecksum();
  await testConcurrentClients();
  await testStatsContent();
  await testMetricsRanges();

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
