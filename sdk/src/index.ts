export { TinyTrackClient, createClient } from './client.js';
export type { TinyTrackClientOptions, CreateClientOptions, ClientEventMap, ReconnectStrategy } from './client.js';
export type { TtMetrics, TtConfig, TtAck, TtStats, TtHistoryResp, TtSysInfo } from './client.js';
export {
  /* Protocol constants */
  PROTO_MAGIC,
  HEADER_SIZE,
  /* Packet types */
  PKT_METRICS,
  PKT_CONFIG,
  PKT_ALERT,
  PKT_CMD,
  PKT_ACK,
  PKT_HISTORY_REQ,
  PKT_HISTORY_RESP,
  PKT_SUBSCRIBE,
  PKT_RING_STATS,
  PKT_SYS_INFO,
  /* Ring levels */
  RING_L1,
  RING_L2,
  RING_L3,
  /* Commands */
  CMD_SET_INTERVAL,
  CMD_SET_ALERTS,
  CMD_GET_SNAPSHOT,
  CMD_GET_RING_STATS,
  CMD_GET_SYS_INFO,
  CMD_START,
  CMD_STOP,
  CMD_AUTH,
  /* Packet types (auth) */
  PKT_AUTH_REQ,
  /* ACK status codes */
  ACK_OK,
  ACK_ERROR,
  ACK_AUTH_FAIL,
  /* Builders */
  buildCmd,
  buildHistoryReq,
  buildSubscribe,
  buildAuth,
  historyToMetrics,
  /* Parsers */
  parseHeader,
  parseMetrics,
  parseConfig,
  parseAck,
  parseStats,
  parseHistoryResp,
  parseSysInfo,
} from './proto.js';
export type { TtFrame, TtRingStat, TtAggMetrics } from './proto.js';
