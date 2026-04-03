#ifndef TT_METRICS_H
#define TT_METRICS_H

#include <stddef.h>
#include <stdint.h>

/*
 * tt_metrics - the set of system metrics collected by tinytd and stored
 * in the ring buffer. This is the single source of truth for what we
 * collect and how it is encoded.
 *
 * All percentage values are stored as integer * 100 (e.g. 25.5% -> 2550)
 * to avoid floating point in the shared memory region.
 */
#pragma pack(push, 1)
struct tt_metrics {
  uint64_t timestamp;      /* ms since epoch */
  uint16_t cpu_usage;      /* CPU usage * 100 */
  uint16_t mem_usage;      /* Memory usage * 100 */
  uint32_t net_rx;         /* Network RX, bytes/sec */
  uint32_t net_tx;         /* Network TX, bytes/sec */
  uint16_t load_1min;      /* Load average 1m * 100 */
  uint16_t load_5min;      /* Load average 5m * 100 */
  uint16_t load_15min;     /* Load average 15m * 100 */
  uint32_t nr_running;     /* Running processes */
  uint32_t nr_total;       /* Total processes */
  uint16_t du_usage;       /* Disk usage * 100 */
  uint64_t du_total_bytes; /* Total disk space, bytes */
  uint64_t du_free_bytes;  /* Free disk space, bytes */
}; /* Total 52 bytes */
#pragma pack(pop)

/*
 * Aggregate N samples into one by averaging all numeric fields.
 * Conforms to ttr_aggregate_fn signature.
 */
void tt_metrics_aggregate(const void* samples, uint32_t count, size_t cell_size,
                          void* out);

#endif /* TT_METRICS_H */
