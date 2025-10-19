#ifndef SRC_PROTOCOL_FORMAT_H
#define SRC_PROTOCOL_FORMAT_H

#include <stddef.h>
#include <stdint.h>

#pragma pack(push, 1)
struct p_packet_header {
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

#pragma pack(push, 1)
struct p_metrics_payload {
  uint16_t cpu_usage;      /* 2 bytes  - CPU usage * 100 (25.5% → 2550) */
  uint16_t mem_usage;      /* 2 bytes  - Memory usage * 100 (25.5% → 2550) */
  uint32_t net_rx;         /* 4 bytes  - Network received, bytes/sec */
  uint32_t net_tx;         /* 4 bytes  - Network transmitted, bytes/sec */
  uint16_t load_1min;      /* 2 bytes  - Load average * 100 (1.25 → 125) */
  uint16_t load_5min;      /* 2 bytes  - Load average * 100 (1.25 → 125) */
  uint16_t load_15min;     /* 2 bytes  - Load average * 100 (1.25 → 125) */
  uint32_t nr_running;     /* 4 bytes  - */
  uint32_t nr_total;       /* 4 bytes  - */
  uint16_t du_usage;       /* 2 bytes  - Disk usage * 100 (25.5% → 2550) */
  uint64_t du_total_bytes; /* 8 bytes  - Total size fs, bytes */
  uint64_t du_free_bytes;  /* 8 bytes  - Available size fs, bytes */
  // //   uint8_t flags;            /* 1 byte   - Flags (bitmask) */
}; /* Total 44 bytes */
#pragma pack(pop)

#pragma pack(push, 1)
struct p_alert_payload {
#define ALERT_INFO 0x01
#define ALERT_WARNING 0x02
#define ALERT_CRITICAL 0x03
  uint8_t level;     /* 1 byte    - 1=info, 2=warning, 3=critical */
  char message[128]; /* 128 bytes - Alert text (null-terminated) */
}; /* Total 129 bytes */
#pragma pack(pop)

#pragma pack(push, 1)
struct p_config_payload {
  uint32_t interval_ms;   /* 4 bytes  - Update interval in ms */
  uint8_t alerts_enabled; /* 1 byte   - Alerts enabled/disabled */
}; /* Total 5 bytes */
#pragma pack(pop)

#pragma pack(push, 1)
struct p_cmd_payload {
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
struct p_ack_payload {
  uint8_t cmd_type; /* 1 byte   - Confirmed command */
#define ACK_OK 0x0
#define ACK_ERROR 0x01
  uint8_t status; /* 1 byte   - 0=ok, 1=error */
}; /* Total 2 bytes */
#pragma pack(pop)

#pragma pack(push, 1)
struct p_history_point {
  uint64_t timestamp; /* 8 bytes - UNIX time */
  float value;        /* 4 bytes - Value */
};

struct p_history_payload {
#define HISTORY_CPU 0x01
#define HISTORY_MEMORY 0x02
#define HISTORY_LOAD 0x03
#define HISTORY_DU 0x04
  uint8_t metric_type;             /* 1 byte  - cpu=1, mem=2, etc. */
  uint32_t count;                  /* 4 bytes - How many points */
  struct p_history_point points[]; /* N * 12 bytes */
};
#pragma pack(pop)

// #pragma pack(push, 1)
// struct p_history_payload {
// #define HISTORY_CPU 0x01
// #define HISTORY_MEMORY 0x02
// #define HISTORY_LOAD 0x03
// #define HISTORY_DU 0x04
//     uint8_t metric_type;      /* 1 byte  - cpu=1, mem=2, etc. */
//     uint32_t count;           /* 4 bytes - How many points */
//     struct {
//         uint64_t timestamp;   /* 8 bytes - UNIX time */
//         float value;          /* 4 bytes - Value */
//     } points[];               /* N * 12 bytes */
// };
// #pragma pack(pop)

void* p_build_packet(uint8_t type, const void* payload, uint16_t length,
                     uint16_t* out_size);
int p_parse_header(const uint8_t* data, size_t len,
                   struct p_packet_header* hdr);

#endif /* SRC_PROTOCOL_FORMAT_H */