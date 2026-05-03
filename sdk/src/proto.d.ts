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
export declare const PROTO_MAGIC = 170;
export declare const HEADER_SIZE = 10;
export declare const PKT_METRICS = 1;
export declare const PKT_CONFIG = 2;
export declare const PKT_ALERT = 3;
export declare const PKT_CMD = 4;
export declare const PKT_ACK = 5;
export declare const PKT_HISTORY_REQ = 16;
export declare const PKT_HISTORY_RESP = 17;
export declare const PKT_SUBSCRIBE = 18;
export declare const PKT_RING_STATS = 19;
export declare const PKT_SYS_INFO = 20;
export declare const RING_L1 = 1;
export declare const RING_L2 = 2;
export declare const RING_L3 = 3;
export declare const HISTORY_FLAG_LAST = 1;
export declare const HISTORY_FLAG_AGG = 2;
export declare const CMD_SET_INTERVAL = 1;
export declare const CMD_SET_ALERTS = 2;
export declare const CMD_GET_SNAPSHOT = 3;
export declare const CMD_GET_RING_STATS = 16;
export declare const CMD_GET_SYS_INFO = 17;
export declare const CMD_START = 18;
export declare const CMD_STOP = 19;
export declare const CMD_AUTH = 20;
export declare const PKT_AUTH_REQ = 21;
export declare const ACK_OK = 0;
export declare const ACK_ERROR = 1;
export declare const ACK_AUTH_FAIL = 2;
export declare const PKT_ALERTS_RESP = 32;
export declare const CMD_GET_ALERTS = 32;
export declare const CMD_CLEAR_ALERTS = 33;
export interface TtMetrics {
  timestamp: number;
  cpu: number;
  mem: number;
  netRx: number;
  netTx: number;
  load1: number;
  load5: number;
  load15: number;
  nrRunning: number;
  nrTotal: number;
  duUsage: number;
  duTotal: number;
  duFree: number;
}
export interface TtConfig {
  intervalMs: number;
  alertsEnabled: boolean;
}
export interface TtAck {
  cmdType: number;
  status: number;
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
  aggregated: boolean;
  samples: TtMetrics[] | TtAggMetrics[];
}
/** Aggregated metrics for L2/L3 — min/max/avg per window (156 bytes). */
export interface TtAggMetrics {
  avg: TtMetrics;
  min: TtMetrics;
  max: TtMetrics;
}
export interface TtFrame {
  type: number;
  version: number;
  timestamp: number;
  payload: DataView;
}
/** Parse the 10-byte header. Returns null if buffer is too short or magic is wrong. */
export declare function parseHeader(buf: ArrayBufferLike, offset?: number): TtFrame | null;
/** Parse PKT_METRICS payload (52 bytes, little-endian). */
export declare function parseMetrics(p: DataView): TtMetrics;
/** Parse PKT_CONFIG payload (5 bytes). */
export declare function parseConfig(p: DataView): TtConfig;
/** Parse PKT_ACK payload (2 bytes). */
export declare function parseAck(p: DataView): TtAck;
/** Parse PKT_STATS payload (75 bytes = 3 × 25). */
export declare function parseStats(p: DataView): TtStats;
/** Extract TtMetrics[] from a history response.
 * For L2/L3 (aggregated), returns the avg field of each TtAggMetrics. */
export declare function historyToMetrics(r: TtHistoryResp): TtMetrics[];
/** If HISTORY_FLAG_AGG is set (L2/L3), samples are TtAggMetrics (156 bytes each).
 * Otherwise (L1), samples are TtMetrics (52 bytes each). */
export declare function parseHistoryResp(p: DataView): TtHistoryResp;
/** Parse PKT_SYS_INFO payload (168 bytes). */
export declare function parseSysInfo(p: DataView): TtSysInfo;
export declare function buildCmd(cmdType: number, arg?: number): ArrayBuffer;
export declare function buildHistoryReq(level: number, maxCount?: number, fromTs?: number, toTs?: number): ArrayBuffer;
export declare function buildSubscribe(level: number, intervalMs?: number): ArrayBuffer;
/**
 * Build a CMD_AUTH frame.
 * Sent in response to PKT_AUTH_REQ, or proactively on connect.
 * token must be ≤ 63 bytes (null-terminated in 64-byte field).
 */
export declare function buildAuth(token: string): ArrayBuffer;
