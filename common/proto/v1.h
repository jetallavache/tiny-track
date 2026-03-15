#ifndef TT_PROTO_V1_H
#define TT_PROTO_V1_H

#include <stdint.h>

#include "common/metrics.h"

#pragma pack(push, 1)
struct tt_proto_packet_header {
  uint8_t magic;   /* 1 byte   - Magic byte (0xAA) */
  uint8_t version; /* 1 byte   - Protocol version (for future compatibility) */
#define PKT_METRICS 0x01
#define PKT_CONFIG 0x02
#define PKT_HISTORY 0x03
#define PKT_ALERT 0x04
#define PKT_CMD 0x05
#define PKT_ACK 0x06
  uint8_t type;       /* 1 byte   - Packet type */
  uint16_t length;    /* 2 bytes  - Payload length (host-to-network order) */
  uint32_t timestamp; /* 4 bytes  - Unix timestamp */
  uint8_t checksum;   /* 1 byte   - XOR Checksum */
}; /* Total 10 bytes */
#pragma pack(pop)

/* tt_metrics (collected system metrics) is defined in common/metrics.h */#pragma pack(push, 1)
struct tt_proto_alert {
#define ALERT_INFO 0x01
#define ALERT_WARNING 0x02
#define ALERT_CRITICAL 0x03
  uint8_t level;     /* 1 byte    - 1=info, 2=warning, 3=critical */
  char message[128]; /* 128 bytes - Alert text (null-terminated) */
}; /* Total 129 bytes */
#pragma pack(pop)

#pragma pack(push, 1)
struct tt_proto_config {
  uint32_t interval_ms;   /* 4 bytes  - Update interval in ms */
  uint8_t alerts_enabled; /* 1 byte   - Alerts enabled/disabled */
}; /* Total 5 bytes */
#pragma pack(pop)

#pragma pack(push, 1)
struct tt_proto_cmd {
#define CMD_SET_INTERVAL 0x01
#define CMD_SET_ALERTS 0x02
#define CMD_GET_HISTORY 0x03
#define CMD_GET_SNAPSHOT 0x04
  uint8_t cmd_type; /* 1 byte   - 1=set_interval, 2=enable_alerts,
                       3=onetime_snapshot_metrics */
  union {
    uint32_t interval_ms;   /* 4 bytes  - */
    uint8_t alerts_enabled; /* 1 byte - */
    uint64_t from_ts;       /* 8 bytes  - */
    uint64_t to_ts;         /* 8 bytes  - */
    uint8_t metric_type;    /* 1 byte - */
  };
}; /* Total 5 bytes */
#pragma pack(pop)

#pragma pack(push, 1)
struct tt_proto_ack {
  uint8_t cmd_type; /* 1 byte   - Confirmed command */
#define ACK_OK 0x0
#define ACK_ERROR 0x01
  uint8_t status; /* 1 byte   - 0=ok, 1=error */
}; /* Total 2 bytes */
#pragma pack(pop)

#pragma pack(push, 1)
struct tt_proto_packet_payload {
  struct tt_proto_packet_header header; /* 10 bytes */
  struct tt_metrics payload;            /* 52 bytes */
}; /* Total 62 bytes */
#pragma pack(pop)

/*

tt_proto_packet_payload:

tt_proto_packet_header + tt_proto_metrics
tt_proto_packet_header + tt_proto_alert
tt_proto_packet_header + tt_proto_cmd
tt_proto_packet_header + tt_proto_ack

*/

#endif /* TT_PROTO_V1_H */