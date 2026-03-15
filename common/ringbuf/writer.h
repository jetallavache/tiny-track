#ifndef TTR_WRITER_H
#define TTR_WRITER_H

#include <stddef.h>
#include <stdint.h>
#include <sys/types.h>

#include "common/proto/v1.h"

enum {
  TTR_WRITER_OK = 0,
  TTR_WRITER_ERR_LIVE_CREATE = -1,
  TTR_WRITER_ERR_SHADOW_CREATE = -2,
  TTR_WRITER_ERR_NULL = -3,
  TTR_WRITER_ERR_NODATA = -4,
};

struct ttr_writer {
  void* live_addr;
  void* shadow_addr;
  size_t total_size;
  uint32_t l1_capacity;
  uint32_t l2_capacity;
  uint32_t l3_capacity;
  mode_t file_mode;
  /* Dirty range tracking for incremental shadow_sync */
  size_t dirty_min;
  size_t dirty_max;
};

int ttr_writer_init(struct ttr_writer* ctx, const char* live_path,
                    const char* shadow_path, uint32_t l1_capacity,
                    uint32_t l2_capacity, uint32_t l3_capacity,
                    mode_t file_mode);
int ttr_writer_write_l1(struct ttr_writer* ctx,
                        struct tt_proto_metrics* sample);
int ttr_writer_aggregate_l2(struct ttr_writer* ctx);
int ttr_writer_aggregate_l3(struct ttr_writer* ctx);
int ttr_writer_shadow_sync(struct ttr_writer* ctx);
void ttr_writer_cleanup(struct ttr_writer* ctx);

/* Returns 1 if shadow was valid and live was restored, 0 otherwise */
int ttr_writer_recover_from_shadow(struct ttr_writer* ctx);

#endif /* TTR_WRITER_H */
