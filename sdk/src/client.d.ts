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
import { RING_L1, RING_L2, RING_L3, TtMetrics, TtConfig, TtAck, TtStats, TtHistoryResp, TtSysInfo } from './proto.js';
export type { TtMetrics, TtConfig, TtAck, TtStats, TtHistoryResp, TtSysInfo };
export { RING_L1, RING_L2, RING_L3 };
export type ClientEventMap = {
  /** TCP connection established, before WS handshake */
  connect: [];
  /** WS handshake complete, streaming active */
  ready: [];
  open: [];
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
  password?: string;
  socket?: {
    connectTimeout?: number;
    reconnectStrategy?: ReconnectStrategy;
  };
}
export declare class TinyTrackClient {
  private url;
  private opts;
  private ws;
  private listeners;
  private retries;
  private _closed;
  private _connectTimer;
  private _readyResolve;
  private _readyReject;
  constructor(url: string, opts?: TinyTrackClientOptions);
  /** Connect and return Promise<void> that resolves on 'ready'. */
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  get connected(): boolean;
  getSnapshot(): void;
  getStats(): void;
  getSysInfo(): void;
  setInterval(ms: number): void;
  start(): void;
  stop(): void;
  getHistory(level: number, maxCount?: number, fromTs?: number, toTs?: number): void;
  subscribe(level: number, intervalMs?: number): void;
  on<K extends keyof ClientEventMap>(event: K, fn: Listener<K>): this;
  off<K extends keyof ClientEventMap>(event: K, fn: Listener<K>): this;
  private _open;
  private _clearConnectTimer;
  private _send;
  private _emit;
}
/**
 * createClient — preferred factory function (redis/mongoose style).
 *
 * @example
 * const client = createClient({ url: 'ws://localhost:25015', password: 'secret' });
 * client.on('metrics', m => console.log(m));
 * await client.connect();
 */
export declare function createClient(opts: CreateClientOptions): TinyTrackClient;
