/*
 * TinyTrack Wire Protocol - Version 3
 * ====================================
 *
 * Extends v2 with alerts ring support.
 * All v1 and v2 packet types remain valid.
 *
 * Status: PLANNED — not yet implemented.
 *
 * New packet types (v3)
 * ---------------------
 *   PKT_ALERTS_RESP  (0x20)  Server → Client  Alerts ring dump
 *
 * New commands (v3, extend PKT_CMD)
 * ----------------------------------
 *   CMD_GET_ALERTS   (0x20)  Request alerts ring contents
 *   CMD_CLEAR_ALERTS (0x21)  Clear alerts ring
 *
 * Alert event layout
 * ------------------
 *   Each tt_alert_event carries the exact tt_metrics snapshot at the moment
 *   the threshold was crossed, plus metadata identifying which metric and
 *   threshold triggered the event.
 *
 *   PKT_ALERTS_RESP payload:
 *
 *     +-------+----------------------------------+
 *     | count | events[count] (tt_alert_event)   |
 *     | 2 byte| count * sizeof(tt_alert_event)   |
 *     +-------+----------------------------------+
 */

#ifndef TT_PROTO_V3_H
#define TT_PROTO_V3_H

#include <stdint.h>

#include "common/metrics.h"
#include "common/proto/v2.h" /* Inherits all v1 + v2 types */

/* ------------------------------------------------------------------ */
/* Version                                                              */
/* ------------------------------------------------------------------ */

#define TT_PROTO_V3 0x03u

/* ------------------------------------------------------------------ */
/* New packet type codes                                                */
/* ------------------------------------------------------------------ */

#define PKT_ALERTS_RESP 0x20u /* Alerts ring dump (server → client) */

/* ------------------------------------------------------------------ */
/* New v3 commands (extend PKT_CMD from v1/v2)                         */
/* ------------------------------------------------------------------ */

#define CMD_GET_ALERTS 0x20u   /* Request PKT_ALERTS_RESP            */
#define CMD_CLEAR_ALERTS 0x21u /* Clear alerts ring                  */

/* ------------------------------------------------------------------ */
/* Alert metric identifiers                                             */
/* ------------------------------------------------------------------ */

#define ALERT_METRIC_CPU 0x01u
#define ALERT_METRIC_MEM 0x02u
#define ALERT_METRIC_LOAD1 0x03u
#define ALERT_METRIC_DISK 0x04u

/* Alert severity levels (reuse from v1 PKT_ALERT) */
/* ALERT_INFO / ALERT_WARNING / ALERT_CRITICAL defined in v1.h */

/* ------------------------------------------------------------------ */
/* tt_alert_event  (sizeof(tt_metrics) + 12 bytes overhead)            */
/* ------------------------------------------------------------------ */

#pragma pack(push, 1)
struct tt_alert_event {
  uint64_t ts;                /* Unix ms when threshold was crossed         */
  uint8_t metric_id;          /* ALERT_METRIC_* constant                    */
  uint8_t severity;           /* ALERT_WARNING or ALERT_CRITICAL            */
  uint16_t value;             /* Metric value at trigger time (same units)  */
  uint16_t threshold;         /* Configured threshold that was crossed      */
  uint16_t _reserved;         /* Must be 0                                  */
  struct tt_metrics snapshot; /* Full metrics snapshot at trigger time */
};
#pragma pack(pop)

/* ------------------------------------------------------------------ */
/* PKT_ALERTS_RESP payload                                             */
/* ------------------------------------------------------------------ */

#pragma pack(push, 1)
struct tt_proto_alerts_resp {
  uint16_t count; /* Number of tt_alert_event entries that follow    */
  /* Followed by count * sizeof(struct tt_alert_event) bytes         */
};
#pragma pack(pop)

#endif /* TT_PROTO_V3_H */
