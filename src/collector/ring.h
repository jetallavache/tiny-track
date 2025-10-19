#ifndef SRC_COLLECTOR_RING_H
#define SRC_COLLECTOR_RING_H

#include <stdint.h>

#include "../protocol/format.h"

#define HISTORY_SIZE 86400

struct c_metrics_point {
  uint64_t timestamp; /* Unix timestamp ms */
  uint16_t cpu_usage;
  uint16_t mem_usage;
  uint16_t du_usage;
  uint16_t load_15min;
};

struct c_metrics_ring {
  struct c_metrics_point data[HISTORY_SIZE];
  uint32_t head;  /* Last record position*/
  uint32_t count; /* How many points are actually stored? */
};

void c_ring_history_add(struct c_metrics_ring*, struct c_metrics_point);
int c_ring_history_get(struct c_metrics_ring*, uint64_t from, uint64_t to,
                       uint8_t metric_type, struct p_history_point*, int max);

#endif /* SRC_COLLECTOR_RING_H */