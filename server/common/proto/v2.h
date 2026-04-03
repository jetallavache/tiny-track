/*
 * TinyTrack Wire Protocol - Version 2
 * ====================================
 *
 * Extends v1 with history retrieval and ring-buffer level subscriptions.
 * All v1 packet types remain valid; v2 adds new PKT_* codes and commands.
 *
 * Compatibility
 * -------------
 * A v2 server MUST accept v1 clients (version field in header = 0x01).
 * A v1 client receiving an unknown type MUST silently discard the frame.
 *
 * New packet types (v2)
 * ---------------------
 *   PKT_HISTORY_REQ  (0x10)  Client → Server  Request historical data
 *   PKT_HISTORY_RESP (0x11)  Server → Client  Historical data batch
 *   PKT_SUBSCRIBE    (0x12)  Client → Server  Subscribe to ring level
 *   PKT_STATS        (0x13)  Server → Client  Ring buffer statistics
 *
 * History flow
 * ------------
 *   Client sends PKT_HISTORY_REQ specifying ring level (L1/L2/L3),
 *   time range [from_ts .. to_ts], and max sample count.
 *
 *   Server replies with one or more PKT_HISTORY_RESP frames.
 *   Each frame carries up to TT_HISTORY_BATCH_MAX samples.
 *   The last frame in a batch has the `last` flag set to 1.
 *
 *   PKT_HISTORY_RESP payload layout:
 *
 *     +--------+-------+--------+----------------------------------+
 *     | level  | count | flags  | samples[count] (tt_metrics each) |
 *     | 1 byte | 2 byte| 1 byte | count * 52 bytes                 |
 *     +--------+-------+--------+----------------------------------+
 *
 * Subscription flow
 * -----------------
 *   Client sends PKT_SUBSCRIBE to receive push updates from a specific
 *   ring level at a given interval (instead of the default L1 stream).
 *   Server acknowledges with PKT_ACK, then pushes PKT_METRICS frames
 *   from the requested level at the requested interval.
 *
 * Ring buffer statistics
 * ----------------------
 *   Server sends PKT_STATS periodically (or on request via CMD_GET_STATS).
 *   Contains head positions, fill levels, and timestamps for all three
 *   ring levels — useful for client-side progress bars and diagnostics.
 */

#ifndef TT_PROTO_V2_H
#define TT_PROTO_V2_H

#include <stdint.h>

#include "common/metrics.h"
#include "common/proto/v1.h" /* Inherits all v1 types and constants */

/* ------------------------------------------------------------------ */
/* Version                                                              */
/* ------------------------------------------------------------------ */

#define TT_PROTO_V2 0x02u

/* ------------------------------------------------------------------ */
/* New packet type codes                                                */
/* ------------------------------------------------------------------ */

#define PKT_HISTORY_REQ 0x10u  /* History request    (client → server) */
#define PKT_HISTORY_RESP 0x11u /* History response   (server → client) */
#define PKT_SUBSCRIBE 0x12u    /* Level subscription (client → server) */
#define PKT_STATS 0x13u        /* Ring buffer stats  (server → client) */

/* ------------------------------------------------------------------ */
/* Ring level identifiers (used across v2 packets)                     */
/* ------------------------------------------------------------------ */

#define RING_LEVEL_L1 0x01u /* 1h  @ 1s  resolution */
#define RING_LEVEL_L2 0x02u /* 24h @ 1m  resolution */
#define RING_LEVEL_L3 0x03u /* 7d  @ 15m resolution */

/* ------------------------------------------------------------------ */
/* PKT_HISTORY_REQ payload  (18 bytes)                                 */
/* ------------------------------------------------------------------ */

#pragma pack(push, 1)
struct tt_proto_history_req {
  uint8_t level;      /* RING_LEVEL_* constant                      */
  uint64_t from_ts;   /* Start of range, Unix ms (0 = oldest)       */
  uint64_t to_ts;     /* End of range,   Unix ms (0 = latest)       */
  uint16_t max_count; /* Max samples to return (0 = no limit)       */
}; /* 18 bytes */
#pragma pack(pop)

/* ------------------------------------------------------------------ */
/* PKT_HISTORY_RESP payload  (4 + count * sizeof(tt_metrics) bytes)   */
/* ------------------------------------------------------------------ */

#define TT_HISTORY_BATCH_MAX 60u /* Max samples per response frame  */

#define HISTORY_FLAG_LAST 0x01u /* Set on the final frame of a batch */

#pragma pack(push, 1)
struct tt_proto_history_resp {
  uint8_t level;  /* RING_LEVEL_* constant                      */
  uint16_t count; /* Number of samples in this frame            */
  uint8_t flags;  /* HISTORY_FLAG_* bitmask                     */
  /* Followed by count * sizeof(struct tt_metrics) bytes of samples */
}; /* 4 bytes header; total = 4 + count * 52 */
#pragma pack(pop)

/* ------------------------------------------------------------------ */
/* PKT_SUBSCRIBE payload  (6 bytes)                                    */
/* ------------------------------------------------------------------ */

#pragma pack(push, 1)
struct tt_proto_subscribe {
  uint8_t level;        /* RING_LEVEL_* to subscribe to            */
  uint32_t interval_ms; /* Push interval in ms (0 = use daemon default) */
  uint8_t _reserved;    /* Must be 0                               */
}; /* 6 bytes */
#pragma pack(pop)

/* ------------------------------------------------------------------ */
/* PKT_STATS payload  (52 bytes)                                       */
/* One tt_proto_ring_stat per level, three levels total.              */
/* ------------------------------------------------------------------ */

#pragma pack(push, 1)
struct tt_proto_ring_stat {
  uint8_t level;     /* RING_LEVEL_*                             */
  uint32_t capacity; /* Total ring capacity (samples)            */
  uint32_t head;     /* Current write position                   */
  uint32_t filled;   /* Number of valid samples                  */
  uint64_t first_ts; /* Timestamp of oldest sample, Unix ms      */
  uint64_t last_ts;  /* Timestamp of newest sample, Unix ms      */
}; /* 25 bytes */

struct tt_proto_stats {
  struct tt_proto_ring_stat l1; /* L1 ring state */
  struct tt_proto_ring_stat l2; /* L2 ring state */
  struct tt_proto_ring_stat l3; /* L3 ring state */
}; /* 75 bytes */
#pragma pack(pop)

/* ------------------------------------------------------------------ */
/* New v2 commands (extend PKT_CMD from v1)                            */
/* ------------------------------------------------------------------ */

#define CMD_GET_STATS 0x10u /* Request PKT_STATS; no arg           */

#endif /* TT_PROTO_V2_H */
