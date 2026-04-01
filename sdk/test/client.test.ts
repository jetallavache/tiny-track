import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TinyTrackClient, RING_L1 } from '../src/index.js';
import {
  PROTO_MAGIC, HEADER_SIZE, PKT_METRICS, PKT_CONFIG, PKT_ACK, PKT_STATS,
  buildCmd, CMD_GET_SNAPSHOT,
} from '../src/proto.js';

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

class MockWS {
  static OPEN = 1;
  static CLOSED = 3;
  static instance: MockWS | null = null;
  binaryType = 'arraybuffer';
  readyState = MockWS.OPEN;
  sent: ArrayBuffer[] = [];
  onopen:    ((e: Event) => void) | null = null;
  onclose:   ((e: CloseEvent) => void) | null = null;
  onerror:   ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;

  constructor(public url: string) { MockWS.instance = this; }

  send(data: ArrayBuffer) { this.sent.push(data); }
  close() { this.readyState = MockWS.CLOSED; }

  simulateOpen()    { this.onopen?.(new Event('open')); }
  simulateClose(code = 1000) {
    this.readyState = MockWS.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason: '' }));
  }
  simulateMessage(buf: ArrayBuffer) {
    this.onmessage?.(new MessageEvent('message', { data: buf }));
  }
}

vi.stubGlobal('WebSocket', MockWS);

// ---------------------------------------------------------------------------
// Frame builder for tests
// ---------------------------------------------------------------------------

function makeFrame(type: number, payload: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(HEADER_SIZE + payload.byteLength);
  const v = new DataView(buf);
  v.setUint8(0, PROTO_MAGIC);
  v.setUint8(1, 0x01);
  v.setUint8(2, type);
  v.setUint16(3, payload.byteLength, false);
  v.setUint32(5, Math.floor(Date.now() / 1000), false);
  let cs = 0;
  for (let i = 0; i < 9; i++) cs ^= v.getUint8(i);
  v.setUint8(9, cs);
  new Uint8Array(buf, HEADER_SIZE).set(payload);
  return buf;
}

function metricsPayload(): Uint8Array {
  const p = new Uint8Array(52);
  const v = new DataView(p.buffer);
  v.setUint16(8, 5000, true); // cpu 50%
  v.setUint16(10, 7000, true); // mem 70%
  return p;
}

function configPayload(): Uint8Array {
  const p = new Uint8Array(5);
  const v = new DataView(p.buffer);
  v.setUint32(0, 1000, false);
  v.setUint8(4, 1);
  return p;
}

function ackPayload(cmdType: number): Uint8Array {
  return new Uint8Array([cmdType, 0x00]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TinyTrackClient', () => {
  let client: TinyTrackClient;

  beforeEach(() => {
    MockWS.instance = null;
    client = new TinyTrackClient('ws://localhost:4026');
  });

  it('connects and emits open', () => {
    const onOpen = vi.fn();
    client.on('open', onOpen);
    client.connect();
    MockWS.instance!.simulateOpen();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('appends /websocket path', () => {
    client.connect();
    expect(MockWS.instance!.url).toBe('ws://localhost:4026/websocket');
  });

  it('strips trailing /websocket from url', () => {
    const c = new TinyTrackClient('ws://localhost:4026/websocket');
    c.connect();
    expect(MockWS.instance!.url).toBe('ws://localhost:4026/websocket');
  });

  it('emits metrics on PKT_METRICS frame', () => {
    const onMetrics = vi.fn();
    client.on('metrics', onMetrics);
    client.connect();
    MockWS.instance!.simulateOpen();
    MockWS.instance!.simulateMessage(makeFrame(PKT_METRICS, metricsPayload()));
    expect(onMetrics).toHaveBeenCalledOnce();
    expect(onMetrics.mock.calls[0][0].cpu).toBe(5000);
  });

  it('emits config on PKT_CONFIG frame', () => {
    const onConfig = vi.fn();
    client.on('config', onConfig);
    client.connect();
    MockWS.instance!.simulateOpen();
    MockWS.instance!.simulateMessage(makeFrame(PKT_CONFIG, configPayload()));
    expect(onConfig).toHaveBeenCalledOnce();
    expect(onConfig.mock.calls[0][0].intervalMs).toBe(1000);
  });

  it('emits ack on PKT_ACK frame', () => {
    const onAck = vi.fn();
    client.on('ack', onAck);
    client.connect();
    MockWS.instance!.simulateOpen();
    MockWS.instance!.simulateMessage(makeFrame(PKT_ACK, ackPayload(CMD_GET_SNAPSHOT)));
    expect(onAck).toHaveBeenCalledOnce();
    expect(onAck.mock.calls[0][0].status).toBe(0);
  });

  it('sends getSnapshot command', () => {
    client.connect();
    MockWS.instance!.simulateOpen();
    client.getSnapshot();
    expect(MockWS.instance!.sent).toHaveLength(1);
    const frame = new DataView(MockWS.instance!.sent[0]);
    expect(frame.getUint8(2)).toBe(0x04); // PKT_CMD
    expect(frame.getUint8(10)).toBe(CMD_GET_SNAPSHOT);
  });

  it('sends getHistory command', () => {
    client.connect();
    MockWS.instance!.simulateOpen();
    client.getHistory(RING_L1, 20);
    expect(MockWS.instance!.sent).toHaveLength(1);
    const frame = new DataView(MockWS.instance!.sent[0]);
    expect(frame.getUint8(2)).toBe(0x10); // PKT_HISTORY_REQ
  });

  it('does not send when disconnected', () => {
    client.connect();
    // don't call simulateOpen — ws is OPEN by default in MockWS
    MockWS.instance!.readyState = 3; // CLOSED
    client.getSnapshot();
    expect(MockWS.instance!.sent).toHaveLength(0);
  });

  it('emits close event', () => {
    const onClose = vi.fn();
    client.on('close', onClose);
    client.connect();
    MockWS.instance!.simulateClose(1001);
    expect(onClose).toHaveBeenCalledWith(1001, '');
  });

  it('off() removes listener', () => {
    const fn = vi.fn();
    client.on('metrics', fn);
    client.off('metrics', fn);
    client.connect();
    MockWS.instance!.simulateOpen();
    MockWS.instance!.simulateMessage(makeFrame(PKT_METRICS, metricsPayload()));
    expect(fn).not.toHaveBeenCalled();
  });

  it('connected returns true when open', () => {
    client.connect();
    MockWS.instance!.simulateOpen();
    expect(client.connected).toBe(true);
  });

  it('connected returns false after disconnect', () => {
    client.connect();
    MockWS.instance!.simulateOpen();
    client.disconnect();
    expect(client.connected).toBe(false);
  });
});
