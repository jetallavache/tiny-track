/*
 * TinyTrack Wire Protocol - Version 1
 * ====================================
 *
 * Overview
 * --------
 * All communication between tinytrack gateway and WebSocket clients uses
 * binary framing defined here. Every message starts with a fixed 10-byte
 * header followed by a type-specific payload.
 *
 * Byte order: network (big-endian) for multi-byte fields unless noted.
 * Alignment:  all structures are packed (no padding).
 *
 * Frame layout
 * ------------
 *
 *   +--------+--------+--------+-----------+-----------+----------+
 *   | magic  | ver    | type   | length    | timestamp | checksum |
 *   | 1 byte | 1 byte | 1 byte | 2 bytes   | 4 bytes   | 1 byte   |
 *   +--------+--------+--------+-----------+-----------+----------+
 *   |                    payload (0..N bytes)                      |
 *   +--------------------------------------------------------------+
 *
 *   magic     = 0xAA  (sanity check)
 *   version   = 0x01  (this file)
 *   type      = one of PKT_* constants below
 *   length    = payload size in bytes, network byte order
 *   timestamp = Unix time (seconds) of the event, network byte order
 *   checksum  = XOR of all header bytes except checksum itself
 *
 * Packet types (v1)
 * -----------------
 *   PKT_METRICS  (0x01)  Server → Client  Live metrics snapshot
 *   PKT_CONFIG   (0x02)  Server → Client  Current daemon configuration
 *   PKT_ALERT    (0x03)  Server → Client  Threshold alert notification
 *   PKT_CMD      (0x04)  Client → Server  Command request
 *   PKT_ACK      (0x05)  Server → Client  Command acknowledgement
 *
 * Session flow
 * ------------
 *   1. Client connects via WebSocket.
 *   2. Server sends PKT_CONFIG with current settings.
 *   3. Server sends PKT_METRICS every interval_ms milliseconds.
 *   4. Client may send PKT_CMD at any time; server replies with PKT_ACK.
 *   5. Server sends PKT_ALERT when a threshold is crossed.
 *
 * Checksum
 * --------
 *   checksum = magic ^ version ^ type ^ (length_hi) ^ (length_lo)
 *            ^ (ts_b3) ^ (ts_b2) ^ (ts_b1) ^ (ts_b0)
 *   Receiver sets checksum field to 0 before verifying.
 */

#ifndef TT_PROTO_V1_H
#define TT_PROTO_V1_H

#include <stdint.h>

#include "common/metrics.h"

/* ------------------------------------------------------------------ */
/* Magic and version                                                    */
/* ------------------------------------------------------------------ */

#define TT_PROTO_MAGIC   0xAAu
#define TT_PROTO_V1      0x01u

/* ------------------------------------------------------------------ */
/* Packet type codes                                                    */
/* ------------------------------------------------------------------ */

#define PKT_METRICS  0x01u  /* Live metrics snapshot  (server → client) */
#define PKT_CONFIG   0x02u  /* Daemon configuration   (server → client) */
#define PKT_ALERT    0x03u  /* Threshold alert        (server → client) */
#define PKT_CMD      0x04u  /* Command request        (client → server) */
#define PKT_ACK      0x05u  /* Command acknowledgement(server → client) */

/* ------------------------------------------------------------------ */
/* Common header  (10 bytes, every frame starts with this)             */
/* ------------------------------------------------------------------ */

#pragma pack(push, 1)
struct tt_proto_header {
  uint8_t  magic;     /* 0xAA                                    */
  uint8_t  version;   /* TT_PROTO_V1                             */
  uint8_t  type;      /* PKT_* constant                          */
  uint16_t length;    /* Payload length, network byte order      */
  uint32_t timestamp; /* Unix timestamp (seconds), network order */
  uint8_t  checksum;  /* XOR of all header bytes except this one */
}; /* 10 bytes */
#pragma pack(pop)

/* ------------------------------------------------------------------ */
/* PKT_METRICS payload  (52 bytes)                                     */
/* Reuses tt_metrics from common/metrics.h — single source of truth.  */
/* ------------------------------------------------------------------ */

/* payload = struct tt_metrics (see common/metrics.h) */

/* ------------------------------------------------------------------ */
/* PKT_CONFIG payload  (5 bytes)                                       */
/* Sent once on connect; re-sent when daemon config changes.           */
/* ------------------------------------------------------------------ */

#pragma pack(push, 1)
struct tt_proto_config {
  uint32_t interval_ms;   /* Metrics push interval, ms           */
  uint8_t  alerts_enabled;/* 1 = alerts active, 0 = suppressed   */
}; /* 5 bytes */
#pragma pack(pop)

/* ------------------------------------------------------------------ */
/* PKT_ALERT payload  (129 bytes)                                      */
/* Sent when a monitored metric crosses a configured threshold.        */
/* ------------------------------------------------------------------ */

#define ALERT_INFO     0x01u
#define ALERT_WARNING  0x02u
#define ALERT_CRITICAL 0x03u

#pragma pack(push, 1)
struct tt_proto_alert {
  uint8_t level;      /* ALERT_* constant                        */
  char    message[128];/* Null-terminated human-readable text    */
}; /* 129 bytes */
#pragma pack(pop)

/* ------------------------------------------------------------------ */
/* PKT_CMD payload  (9 bytes)                                          */
/* Client sends a command; server replies with PKT_ACK.               */
/* ------------------------------------------------------------------ */

#define CMD_SET_INTERVAL  0x01u /* arg: interval_ms (uint32_t)     */
#define CMD_SET_ALERTS    0x02u /* arg: alerts_enabled (uint8_t)   */
#define CMD_GET_SNAPSHOT  0x03u /* arg: none; server sends metrics */

#pragma pack(push, 1)
struct tt_proto_cmd {
  uint8_t cmd_type; /* CMD_* constant                              */
  union {
    uint32_t interval_ms;    /* CMD_SET_INTERVAL                   */
    uint8_t  alerts_enabled; /* CMD_SET_ALERTS                     */
    uint8_t  _pad[8];        /* Reserved, keep union size fixed    */
  };
}; /* 9 bytes */
#pragma pack(pop)

/* ------------------------------------------------------------------ */
/* PKT_ACK payload  (2 bytes)                                          */
/* ------------------------------------------------------------------ */

#define ACK_OK    0x00u
#define ACK_ERROR 0x01u

#pragma pack(push, 1)
struct tt_proto_ack {
  uint8_t cmd_type; /* Echoes the cmd_type being acknowledged      */
  uint8_t status;   /* ACK_OK or ACK_ERROR                         */
}; /* 2 bytes */
#pragma pack(pop)

#endif /* TT_PROTO_V1_H */
