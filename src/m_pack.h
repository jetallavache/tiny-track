#ifndef SRC_M_PACK_H
#define SRC_M_PACK_H

#include <errno.h>
#include <stdint.h>
#include <time.h>

#include "m_calc.h"
#include "m_state.h"

#define M_PACKET_METRICS 0x01
#define M_PACKET_CONFIG 0x02
#define M_PACKET_HISTORY 0x03
#define M_PACKET_ALERT 0x04

#define M_FLAG_HIGH_CPU (1 << 0)      // CPU > 90%
#define M_FLAG_HIGH_MEM (1 << 1)      // Memory > 90%
#define M_FLAG_HIGH_LOAD (1 << 2)     // Load > cores * 2
#define M_FLAG_LOAD_FALL (1 << 3)     // Load decrease
#define M_FLAG_LOAD_GROW (1 << 4)     // Load increase
#define M_FLAG_NETWORK_DOWN (1 << 5)  // Network traffic 0
#define M_FLAG_DISK_FULL (1 << 6)     // Disk usage > 90%
#define M_FLAG_DISK_LOW (1 << 7)      // Disk free < 1GB

#pragma pack(push, 1)
struct m_pack_metrics {
  uint32_t timestamp;       // 4 bytes  - Unix timestamp
  uint16_t cpu_usage;       // 2 bytes  - CPU usage * 100 (25.5% → 2550)
  uint16_t mem_usage;       // 2 bytes  - Memory usage * 100 (25.5% → 2550)
  uint32_t net_rx;          // 4 bytes  - Network received, bytes/sec
  uint32_t net_tx;          // 4 bytes  - Network transmitted, bytes/sec
  uint16_t load_1min;       // 2 bytes  - Load average * 100 (1.25 → 125)
  uint16_t load_5min;       // 2 bytes  - Load average * 100 (1.25 → 125)
  uint16_t load_15min;      // 2 bytes  - Load average * 100 (1.25 → 125)
  uint32_t nr_running;      // 4 bytes  -
  uint32_t nr_total;        // 4 bytes  -
  uint16_t du_usage;        // 2 bytes  - Disk usage * 100 (25.5% → 2550)
  uint64_t du_total_bytes;  // 8 bytes  - Total size fs, bytes
  uint64_t du_free_bytes;   // 8 bytes  - Available size fs, bytes
  uint8_t flags;            // 1 bytes  - Флаги (bitmask)
};  // = 49 bytes

struct m_pack_header {
  uint8_t magic;         // 1 bytes  - Magic byte (0xAA)
  uint8_t version;       // 1 bytes  - Версия протокола (1)
  uint16_t packet_type;  // 2 bytes  - Тип пакета
  uint32_t timestamp;    // 4 bytes  - Временная метка
  uint16_t data_length;  // 2 bytes  - Длина данных
  uint8_t checksum;      // 1 bytes  - Контрольная сумма
};  // = 11 bytes

struct m_pack_full {
  struct m_pack_header header;    // 49 bytes -
  struct m_pack_metrics metrics;  // 11 bytes -
};  // = 60 bytes
#pragma pack(pop)

void m_pack_header_init(struct m_pack_header *, uint16_t packet_type,
                        size_t data_len);
void m_pack_full_init(struct m_pack_full *);
void m_pack_metrics_update(struct m_pack_metrics *, struct m_state *);

#endif  // SRC_M_PACK_H