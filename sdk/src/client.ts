/**
 * TinyTrackClient — WebSocket client for the tinytrack gateway.
 *
 * Usage:
 *   const client = new TinyTrackClient('ws://localhost:4026');
 *   client.on('metrics', m => console.log(m.cpu / 100, '%'));
 *   client.connect();
 */

import {
  parseHeader,
  parseMetrics,
  parseConfig,
  parseAck,
  parseStats,
  parseHistoryResp,
  parseSysInfo,
  buildCmd,
  buildHistoryReq,
  buildSubscribe,
  buildAuth,
  PKT_METRICS,
  PKT_CONFIG,
  PKT_ACK,
  PKT_RING_STATS,
  PKT_HISTORY_RESP,
  PKT_SYS_INFO,
  PKT_AUTH_REQ,
  CMD_GET_SNAPSHOT,
  CMD_GET_RING_STATS,
  CMD_GET_SYS_INFO,
  CMD_SET_INTERVAL,
  CMD_START,
  CMD_STOP,
  RING_L1,
  RING_L2,
  RING_L3,
  TtMetrics,
  TtConfig,
  TtAck,
  TtStats,
  TtHistoryResp,
  TtSysInfo,
} from './proto.js';

export type { TtMetrics, TtConfig, TtAck, TtStats, TtHistoryResp, TtSysInfo };
export { RING_L1, RING_L2, RING_L3 };

export type ClientEventMap = {
  open: [];
  close: [code: number, reason: string];
  error: [err: Event];
  metrics: [m: TtMetrics];
  config: [c: TtConfig];
  ack: [a: TtAck];
  stats: [s: TtStats];
  history: [r: TtHistoryResp];
  sysinfo: [s: TtSysInfo];
  /** Fired when server requests authentication and no token is configured */
  auth_required: [];
  /** Raw packet: fired for every incoming binary message before parsing */
  packet: [pktType: number, payload: DataView];
};

type Listener<K extends keyof ClientEventMap> = (...args: ClientEventMap[K]) => void;

export interface TinyTrackClientOptions {
  /** Auto-reconnect on close. Default: true */
  reconnect?: boolean;
  /** Reconnect delay ms. Default: 2000 */
  reconnectDelay?: number;
  /** Max reconnect attempts (0 = unlimited). Default: 0 */
  maxRetries?: number;
  /** WebSocket path. Default: '/websocket' */
  path?: string;
  /**
   * Shared secret for authentication.
   * When set, the client automatically responds to PKT_AUTH_REQ with CMD_AUTH.
   * For server-side clients that can set HTTP headers, pass the token via
   * the Authorization header instead: `Authorization: Bearer <token>`.
   */
  token?: string;
}

export class TinyTrackClient {
  private url: string;
  private opts: Required<TinyTrackClientOptions>;
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener<any>>>();
  private retries = 0;
  private _closed = false;

  constructor(url: string, opts: TinyTrackClientOptions = {}) {
    // Normalise: strip trailing path, we'll append opts.path
    this.url = url.replace(/\/websocket\/?$/, '');
    this.opts = {
      reconnect: opts.reconnect ?? true,
      reconnectDelay: opts.reconnectDelay ?? 2000,
      maxRetries: opts.maxRetries ?? 0,
      path: opts.path ?? '/v1/stream',
      token: opts.token ?? '',
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  connect(): this {
    this._closed = false;
    this._open();
    return this;
  }

  disconnect(): void {
    this._closed = true;
    this.ws?.close();
    this.ws = null;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  getSnapshot(): void {
    this._send(buildCmd(CMD_GET_SNAPSHOT));
  }

  getStats(): void {
    this._send(buildCmd(CMD_GET_RING_STATS));
  }

  getSysInfo(): void {
    this._send(buildCmd(CMD_GET_SYS_INFO));
  }

  setInterval(ms: number): void {
    this._send(buildCmd(CMD_SET_INTERVAL, ms));
  }

  start(): void {
    this._send(buildCmd(CMD_START));
  }

  stop(): void {
    this._send(buildCmd(CMD_STOP));
  }

  getHistory(level: number, maxCount = 60, fromTs = 0, toTs = 0): void {
    this._send(buildHistoryReq(level, maxCount, fromTs, toTs));
  }

  subscribe(level: number, intervalMs = 0): void {
    this._send(buildSubscribe(level, intervalMs));
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  on<K extends keyof ClientEventMap>(event: K, fn: Listener<K>): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn as Listener<any>);
    return this;
  }

  off<K extends keyof ClientEventMap>(event: K, fn: Listener<K>): this {
    this.listeners.get(event)?.delete(fn as Listener<any>);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _open(): void {
    const wsUrl = this.url + this.opts.path;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      this.retries = 0;
      this._emit('open');
    };

    ws.onclose = (e) => {
      this._emit('close', e.code, e.reason);
      if (!this._closed && this.opts.reconnect) {
        const max = this.opts.maxRetries;
        if (max === 0 || this.retries < max) {
          this.retries++;
          setTimeout(() => this._open(), this.opts.reconnectDelay);
        }
      }
    };

    ws.onerror = (e) => this._emit('error', e);

    ws.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      const frame = parseHeader(e.data);
      if (!frame) return;
      // Emit raw packet before parsing — for useRawPackets()
      this._emit('packet', frame.type, frame.payload);
      switch (frame.type) {
        case PKT_AUTH_REQ:
          if (this.opts.token) {
            this._send(buildAuth(this.opts.token));
          } else {
            this._emit('auth_required');
          }
          break;
        case PKT_METRICS:
          this._emit('metrics', parseMetrics(frame.payload));
          break;
        case PKT_CONFIG:
          this._emit('config', parseConfig(frame.payload));
          break;
        case PKT_ACK:
          this._emit('ack', parseAck(frame.payload));
          break;
        case PKT_RING_STATS:
          this._emit('stats', parseStats(frame.payload));
          break;
        case PKT_HISTORY_RESP:
          this._emit('history', parseHistoryResp(frame.payload));
          break;
        case PKT_SYS_INFO:
          this._emit('sysinfo', parseSysInfo(frame.payload));
          break;
      }
    };
  }

  private _send(buf: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(buf);
    }
  }

  private _emit<K extends keyof ClientEventMap>(event: K, ...args: ClientEventMap[K]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }
}
