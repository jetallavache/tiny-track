#include "ring.h"

void c_ring_history_add(struct c_metrics_ring* r, struct c_metrics_point p) {
  r->head = (r->head + 1) % HISTORY_SIZE;
  r->data[r->head] = p;
  if (r->count < HISTORY_SIZE) r->count++;
}

int c_ring_history_get(struct c_metrics_ring* r, uint64_t from, uint64_t to,
                       uint8_t metric_type, struct p_history_point* out,
                       int max) {
  int written = 0;
  for (uint32_t i = 0; i < r->count; i++) {
    uint32_t idx = (r->head + HISTORY_SIZE - i) % HISTORY_SIZE;
    struct c_metrics_point* m = &r->data[idx];
    if (m->timestamp < from || m->timestamp > to) continue;

    float val = 0;
    switch (metric_type) {
      case 1:
        val = m->cpu_usage;
        break;
      case 2:
        val = m->mem_usage;
        break;
      case 3:
        val = m->load_15min;
        break;
      case 4:
        val = m->du_usage;
        break;
      default:
        continue;
    }

    out[written].timestamp = m->timestamp;
    out[written].value = val;
    written++;
    if (written >= max) break;
  }
  return written;
}