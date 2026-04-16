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
 * tt_metrics_aggregate_avg - average all numeric fields across N samples.
 * timestamp is set to the latest sample's timestamp.
 * Conforms to ttr_aggregate_fn signature.
 */
void tt_metrics_aggregate_avg(const void* samples, uint32_t count,
                              size_t cell_size, void* out);

/*
 * tt_metrics_aggregate_max - take the maximum value of each field across N
 * samples. Useful for peak-detection aggregation (e.g. worst-case CPU spike
 * over a window). timestamp is set to the latest sample's timestamp.
 * Conforms to ttr_aggregate_fn signature.
 */
void tt_metrics_aggregate_max(const void* samples, uint32_t count,
                              size_t cell_size, void* out);

/*
 * tt_metrics_aggregate_min - take the minimum value of each field across N
 * samples. Useful for detecting idle periods or free-space floors.
 * timestamp is set to the latest sample's timestamp.
 * Conforms to ttr_aggregate_fn signature.
 */
void tt_metrics_aggregate_min(const void* samples, uint32_t count,
                              size_t cell_size, void* out);

/* Alias kept for backward compatibility — resolves to aggregate_avg. */
#define tt_metrics_aggregate tt_metrics_aggregate_avg

/*
 * tt_agg_metrics — aggregated metrics for L2/L3 ring levels.
 * Stores min/max/avg per window so peaks are not lost.
 * L1 continues to use tt_metrics (raw samples).
 *
 * Wire size: 3 * sizeof(tt_metrics) = 156 bytes.
 * The `is_aggregated` flag in PKT_HISTORY_RESP distinguishes L1 vs L2/L3.
 */
#pragma pack(push, 1)
struct tt_agg_metrics {
  struct tt_metrics avg; /* Average over the aggregation window */
  struct tt_metrics min; /* Per-field minimum */
  struct tt_metrics max; /* Per-field maximum */
}; /* 156 bytes */
#pragma pack(pop)

/*
 * Compute tt_agg_metrics (avg+min+max) from N tt_metrics samples.
 */
void tt_metrics_aggregate_agg(const void* samples, uint32_t count,
                              size_t cell_size, struct tt_agg_metrics* out);

#endif /* TT_METRICS_H */
