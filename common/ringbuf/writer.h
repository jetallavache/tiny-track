#ifndef TTR_WRITER_H
#define TTR_WRITER_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <sys/types.h>

/*
 * Aggregation callback: given `count` samples of `cell_size` bytes each
 * starting at `samples`, write one aggregated sample into `out`.
 */
typedef void (*ttr_aggregate_fn)(const void* samples, uint32_t count,
                                 size_t cell_size, void* out);

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
  size_t cell_size;
  uint32_t l1_capacity;
  uint32_t l2_capacity;
  uint32_t l3_capacity;
  mode_t file_mode;
  bool enable_crc;
  ttr_aggregate_fn aggregate;
  /* Dirty range tracking for incremental shadow_sync */
  size_t dirty_min;
  size_t dirty_max;
};

struct ttr_writer_config {
  const char* live_path;
  const char* shadow_path;
  uint32_t l1_capacity;
  uint32_t l2_capacity;
  uint32_t l3_capacity;
  size_t cell_size;
  mode_t file_mode;
  ttr_aggregate_fn aggregate;
};

int ttr_writer_init(struct ttr_writer* ctx, const struct ttr_writer_config* cfg);
int ttr_writer_write_l1(struct ttr_writer* ctx, const void* sample);
int ttr_writer_aggregate_l2(struct ttr_writer* ctx);
int ttr_writer_aggregate_l3(struct ttr_writer* ctx);
int ttr_writer_shadow_sync(struct ttr_writer* ctx);
void ttr_writer_cleanup(struct ttr_writer* ctx);

/* Returns 1 if shadow was valid and live was restored, 0 otherwise */
int ttr_writer_recover_from_shadow(struct ttr_writer* ctx);

#endif /* TTR_WRITER_H */
