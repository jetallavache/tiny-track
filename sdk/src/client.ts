/**
 * TinyTrackClient — WebSocket client for the tinytrack gateway.
 *
 * Preferred usage via factory:
 *   const client = createClient({ url: 'ws://localhost:25015', token: 'secret' });
 *   client.on('metrics', m => console.log(m.cpu / 100, '%'));
 *   await client.connect();
 *
 * Legacy constructor still works:
 *   const client = new TinyTrackClient('ws://localhost:25015');
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
  /** TCP connection established, before WS handshake */
  connect: [];
  /** WS handshake complete, streaming active */
  ready: [];
  open: [] /* alias for ready — kept for compatibility */;
  close: [code: number, reason: string];
  /** Reconnect attempt in progress */
  reconnecting: [attempt: number];
  error: [err: Event];
  disconnect: [];
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

/** Reconnect strategy: return delay ms, or Error to stop reconnecting. */
export type ReconnectStrategy = (retries: number) => number | Error;

const defaultReconnectStrategy: ReconnectStrategy = (retries) => Math.min(500 * 2 ** retries, 30_000);

export interface TinyTrackClientOptions {
  /** Auto-reconnect on close. Default: true */
  reconnect?: boolean;
  /** @deprecated Use socket.reconnectStrategy instead */
  reconnectDelay?: number;
  /** Max reconnect attempts (0 = unlimited). Default: 0 */
  maxRetries?: number;
  /** WebSocket path. Default: '/v1/stream' */
  path?: string;
  /**
   * Shared secret for authentication.
   * Automatically sent in response to PKT_AUTH_REQ.
   */
  token?: string;
  socket?: {
    /** Connection timeout ms. Default: 5000 */
    connectTimeout?: number;
    /** Custom reconnect strategy. Default: exponential backoff capped at 30s */
    reconnectStrategy?: ReconnectStrategy;
  };
}

/** Options for createClient() factory — preferred API. */
export interface CreateClientOptions {
  /** WebSocket URL, e.g. 'ws://localhost:25015' */
  url: string;
  /** Auth token — sent automatically on PKT_AUTH_REQ */
  token?: string;
  socket?: {
    connectTimeout?: number;
    reconnectStrategy?: ReconnectStrategy;
  };
}

export class TinyTrackClient {
  private url: string;
  private opts: Required<Omit<TinyTrackClientOptions, 'socket'>> & {
    socket: Required<NonNullable<TinyTrackClientOptions['socket']>>;
  };
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener<any>>>();
  private retries = 0;
  private _closed = false;
  private _connectTimer: ReturnType<typeof setTimeout> | null = null;
  private _readyResolve: (() => void) | null = null;
  private _readyReject: ((e: Error) => void) | null = null;

  constructor(url: string, opts: TinyTrackClientOptions = {}) {
    /* Normalise URL: strip trailing slash and any existing path suffix */
    this.url = url.replace(/\/$/, '').replace(/\/(v1\/stream|websocket)\/?$/, '');
    this.opts = {
      reconnect: opts.reconnect ?? true,
      reconnectDelay: opts.reconnectDelay ?? 2000,
      maxRetries: opts.maxRetries ?? 0,
      path: opts.path ?? '/v1/stream',
      token: opts.token ?? '',
      socket: {
        connectTimeout: opts.socket?.connectTimeout ?? 5000,
        reconnectStrategy: opts.socket?.reconnectStrategy ?? defaultReconnectStrategy,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Connect and return Promise<void> that resolves on 'ready'. */
  connect(): Promise<void> {
    this._closed = false;
    return new Promise<void>((resolve, reject) => {
      this._readyResolve = resolve;
      this._readyReject = reject;
      this._open();
    });
  }

  disconnect(): Promise<void> {
    this._closed = true;
    this._clearConnectTimer();
    this._readyResolve = null;
    this._readyReject = null;
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const ws = this.ws!;
      ws.onclose = () => {
        this._emit('disconnect');
        resolve();
      };
      ws.close();
      this.ws = null;
    });
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
    /* Build WS URL: ensure ws:// scheme and no double slashes */
    let base = this.url;
    /* Convert http(s):// → ws(s):// so users can pass either scheme */
    base = base.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
    const wsUrl = base + this.opts.path;

    this._emit('connect');

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    /* Connect timeout */
    this._connectTimer = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        const err = new Error(`Connection timeout (${this.opts.socket.connectTimeout}ms)`);
        this._readyReject?.(err);
        this._readyReject = null;
      }
    }, this.opts.socket.connectTimeout);

    ws.onopen = () => {
      this._clearConnectTimer();
      this.retries = 0;
      this._emit('ready');
      this._emit('open');
      this._readyResolve?.();
      this._readyResolve = null;
      this._readyReject = null;
    };

    ws.onclose = (e) => {
      this._clearConnectTimer();
      this._emit('close', e.code, e.reason);
      this._emit('disconnect');
      if (!this._closed && this.opts.reconnect) {
        const max = this.opts.maxRetries;
        if (max === 0 || this.retries < max) {
          const delay = this.opts.socket.reconnectStrategy(this.retries);
          if (delay instanceof Error) return;
          this.retries++;
          this._emit('reconnecting', this.retries);
          setTimeout(() => this._open(), delay);
        }
      }
    };

    ws.onerror = (e) => {
      this._emit('error', e);
      this._readyReject?.(new Error('WebSocket error'));
      this._readyReject = null;
    };

    ws.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      const frame = parseHeader(e.data);
      if (!frame) return;
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

  private _clearConnectTimer(): void {
    if (this._connectTimer !== null) {
      clearTimeout(this._connectTimer);
      this._connectTimer = null;
    }
  }

  private _send(buf: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(buf);
  }

  private _emit<K extends keyof ClientEventMap>(event: K, ...args: ClientEventMap[K]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }
}

/**
 * createClient — preferred factory function (redis/mongoose style).
 *
 * @example
 * const client = createClient({ url: 'ws://localhost:25015', token: 'secret' });
 * client.on('metrics', m => console.log(m));
 * await client.connect();
 */
export function createClient(opts: CreateClientOptions): TinyTrackClient {
  return new TinyTrackClient(opts.url, {
    token: opts.token,
    socket: opts.socket,
  });
}
