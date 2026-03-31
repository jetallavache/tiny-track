#!/usr/bin/env node
/**
 * TinyTrack WebSocket integration test
 * Tests proto v1/v2 against a live tinytrack gateway.
 *
 * Usage: node test_gateway.js [ws://host:port]
 * Exit:  0 = all passed, 1 = failures
 */

'use strict';

const { WebSocket } = require('ws');
const proto = require('./manual-gateway-test/proto.js');

const URL = process.argv[2] || 'ws://127.0.0.1:4028/websocket';
const TIMEOUT_MS = 10000;

/* ------------------------------------------------------------------ */
/* Test runner                                                          */
/* ------------------------------------------------------------------ */

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
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function parseMetrics(buf) {
  /* tt_metrics layout (52 bytes, all uint32/float LE):
   * cpu_usage(4) mem_usage(4) mem_used(8) mem_total(8)
   * net_rx(8) net_tx(8) du_usage(4) du_used(8) du_total(8)
   * load_1min(4) load_5min(4) load_15min(4)
   * nr_running(4) nr_total(4) timestamp(8)
   * Total = 4+4+8+8+8+8+4+8+8+4+4+4+4+4+8 = 92? use proto.js */
  return proto.parseMetrics(buf);
}

/* ------------------------------------------------------------------ */
/* Main test sequence                                                   */
/* ------------------------------------------------------------------ */

async function runTests() {
  return new Promise((resolve) => {
    const ws = new WebSocket(URL, { handshakeTimeout: TIMEOUT_MS });
    const received = [];
    let timer = null;

    function finish() {
      clearTimeout(timer);
      ws.terminate();
      resolve();
    }

    timer = setTimeout(() => {
      ok('connection timeout', false, `no response within ${TIMEOUT_MS}ms`);
      finish();
    }, TIMEOUT_MS);

    ws.on('error', (e) => {
      ok('connect', false, e.message);
      clearTimeout(timer);
      resolve();
    });

    ws.on('open', () => {
      ok('connect', true);
      /* Request snapshot immediately — don't wait for push timer */
      ws.send(proto.buildCmd(proto.PROTO.CMD_GET_SNAPSHOT));
    });

    ws.on('message', (data) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const frame = proto.parseFrame(ab);
      if (!frame) return;
      received.push(frame);
      handleFrame(frame);
    });

    /* State machine */
    let gotConfig = false, gotMetrics = false, gotAck = false,
        gotHistResp = false, gotStats = false;

    function handleFrame(frame) {
      const P = proto.PROTO;

      if (frame.type === P.PKT_CONFIG && !gotConfig) {
        gotConfig = true;
        ok('PKT_CONFIG received', true);
        const intervalMs = frame.payload.getUint32(0);
        ok('PKT_CONFIG interval_ms > 0', intervalMs > 0, `got ${intervalMs}`);

        /* Send CMD_GET_SNAPSHOT */
        ws.send(proto.buildCmd(P.CMD_GET_SNAPSHOT));
      }

      if (frame.type === P.PKT_METRICS && !gotMetrics) {
        gotMetrics = true;
        ok('PKT_METRICS received', true);
        const m = proto.parseMetrics(frame.payload);
        ok('metrics.cpu_usage in [0..10000]',
           m.cpu_usage >= 0 && m.cpu_usage <= 10000,
           `got ${m.cpu_usage}`);
        ok('metrics.mem_usage in [0..10000]',
           m.mem_usage >= 0 && m.mem_usage <= 10000,
           `got ${m.mem_usage}`);
        ok('metrics.timestamp > 0', m.timestamp > 0, `got ${m.timestamp}`);

        /* Send CMD_GET_STATS (v2) */
        ws.send(proto.buildCmd(P.CMD_GET_STATS));

        /* Request L1 history */
        ws.send(proto.buildHistoryReq(P.RING_L1, 10, 0, 0));

        /* Subscribe to L2 */
        ws.send(proto.buildSubscribe(P.RING_L2, 0));
      }

      if (frame.type === P.PKT_ACK && !gotAck) {
        gotAck = true;
        ok('PKT_ACK received', true);
        ok('PKT_ACK status OK',
           frame.payload.getUint8(1) === P.ACK_OK,
           `status=${frame.payload.getUint8(1)}`);
      }

      if (frame.type === P.PKT_HISTORY_RESP && !gotHistResp) {
        gotHistResp = true;
        ok('PKT_HISTORY_RESP received', true);
        const level = frame.payload.getUint8(0);
        const count = frame.payload.getUint16(1);
        ok('history level = L1', level === P.RING_L1, `got ${level}`);
        ok('history count >= 0', count >= 0, `got ${count}`);
      }

      if (frame.type === P.PKT_STATS && !gotStats) {
        gotStats = true;
        ok('PKT_STATS received', true);
        ok('PKT_STATS size >= 75', frame.payload.byteLength >= 75,
           `got ${frame.payload.byteLength}`);
      }

      /* Done when we have all expected packet types */
      if (gotConfig && gotMetrics && gotAck && gotHistResp && gotStats)
        finish();
    }

    /* After 6s force-finish and report what's missing */
    setTimeout(() => {
      if (!gotConfig)    ok('PKT_CONFIG received', false, 'timeout');
      if (!gotMetrics)   ok('PKT_METRICS received', false, 'timeout');
      if (!gotAck)       ok('PKT_ACK received', false, 'timeout');
      if (!gotHistResp)  ok('PKT_HISTORY_RESP received', false, 'timeout');
      if (!gotStats)     ok('PKT_STATS received', false, 'timeout');
      finish();
    }, 6000);
  });
}

/* ------------------------------------------------------------------ */
/* Entry point                                                          */
/* ------------------------------------------------------------------ */

(async () => {
  console.log(`\nTinyTrack Gateway Integration Tests`);
  console.log(`Target: ${URL}\n`);

  await runTests();

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
