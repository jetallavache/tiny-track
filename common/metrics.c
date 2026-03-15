#include "metrics.h"

#include <string.h>

void tt_metrics_aggregate(const void* samples, uint32_t count,
                          size_t cell_size, void* out) {
  if (!samples || !out || count == 0)
    return;

  uint64_t cpu = 0, mem = 0, net_rx = 0, net_tx = 0;
  uint64_t load1 = 0, load5 = 0, load15 = 0;
  uint64_t du_usage = 0, du_total = 0, du_free = 0;
  uint32_t nr_running = 0, nr_total = 0;
  uint64_t last_ts = 0;

  for (uint32_t i = 0; i < count; i++) {
    const struct tt_metrics* s =
        (const struct tt_metrics*)((const uint8_t*)samples + i * cell_size);
    cpu      += s->cpu_usage;
    mem      += s->mem_usage;
    net_rx   += s->net_rx;
    net_tx   += s->net_tx;
    load1    += s->load_1min;
    load5    += s->load_5min;
    load15   += s->load_15min;
    nr_running += s->nr_running;
    nr_total   += s->nr_total;
    du_usage += s->du_usage;
    du_total += s->du_total_bytes;
    du_free  += s->du_free_bytes;
    if (s->timestamp > last_ts)
      last_ts = s->timestamp;
  }

  struct tt_metrics* agg = (struct tt_metrics*)out;
  memset(agg, 0, sizeof(*agg));
  agg->timestamp      = last_ts;
  agg->cpu_usage      = (uint16_t)(cpu / count);
  agg->mem_usage      = (uint16_t)(mem / count);
  agg->net_rx         = (uint32_t)(net_rx / count);
  agg->net_tx         = (uint32_t)(net_tx / count);
  agg->load_1min      = (uint16_t)(load1 / count);
  agg->load_5min      = (uint16_t)(load5 / count);
  agg->load_15min     = (uint16_t)(load15 / count);
  agg->nr_running     = nr_running / count;
  agg->nr_total       = nr_total / count;
  agg->du_usage       = (uint16_t)(du_usage / count);
  agg->du_total_bytes = du_total / count;
  agg->du_free_bytes  = du_free / count;
}
