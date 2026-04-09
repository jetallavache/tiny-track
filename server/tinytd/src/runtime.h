#ifndef TTD_RUNTIME_H
#define TTD_RUNTIME_H

#include <stdint.h>

#include "collector.h"
#include "config.h"
#include "writer.h"

struct ttd_runtime {
  int epoll_fd;
  int timer_fd;
  struct ttd_config* cfg;
  struct ttd_collector_state* state;
  struct ttd_writer* writer;
  uint64_t next_l2;
  uint64_t next_l3;
  uint64_t next_shadow;
};

int ttd_runtime_init(struct ttd_runtime* rt, struct ttd_config* cfg,
                     struct ttd_collector_state* state,
                     struct ttd_writer* writer);
void ttd_runtime_poll(struct ttd_runtime* rt, int timeout_ms);
void ttd_runtime_free(struct ttd_runtime* rt);

#endif /* TTD_RUNTIME_H */
