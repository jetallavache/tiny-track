#ifndef TT_RING_WRITER_H
#define TT_RING_WRITER_H

#include <stddef.h>
#include <stdint.h>
#include <sys/types.h>

#include "common/proto/v1.h"

enum {
  TT_WRITER_OK = 0,
  TT_WRITER_ERR_LIVE_CREATE = -1,
  TT_WRITER_ERR_SHADOW_CREATE = -2,
};

struct tt_ring_writer {
  void* live_addr;
  void* shadow_addr;
  size_t total_size;
  uint32_t l1_capacity;
  uint32_t l2_capacity;
  uint32_t l3_capacity;
  mode_t file_mode;
};

int tt_ring_writer_init(struct tt_ring_writer* ctx, const char* live_path,
                        const char* shadow_path, uint32_t l1_capacity,
                        uint32_t l2_capacity, uint32_t l3_capacity,
                        mode_t file_mode);
int tt_ring_writer_write_l1(struct tt_ring_writer* ctx,
                            struct tt_proto_metrics* sample);
int tt_ring_writer_aggregate_l2(struct tt_ring_writer* ctx);
int tt_ring_writer_aggregate_l3(struct tt_ring_writer* ctx);
int tt_ring_writer_shadow_sync(struct tt_ring_writer* ctx);
void tt_ring_writer_cleanup(struct tt_ring_writer* ctx);

#endif /* TT_RING_WRITER_H */
