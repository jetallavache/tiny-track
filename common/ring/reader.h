#ifndef TT_RING_READER_H
#define TT_RING_READER_H

#include <stddef.h>
#include <stdint.h>

#include "common/proto/v1.h"
#include "layout.h"

enum {
  TT_READER_OK = 0,
  TT_READER_ERR_READ = -1,
  TT_READER_ERR_MAGIC = -2,
  TT_READER_ERR_VERSION = -3,
  TT_READER_ERR_NODATA = -4,
  TT_READER_ERR_INVALID = -5,
  TT_READER_ERR_STALE = -6
};

struct tt_ring_reader {
  void* addr;
  size_t size;
  struct tt_ring_meta* l1_meta;
  struct tt_ring_meta* l2_meta;
  struct tt_ring_meta* l3_meta;
  uint8_t* l1_data;
  uint8_t* l2_data;
  uint8_t* l3_data;
};

int tt_ring_reader_open(struct tt_ring_reader* ctx, const char* path);
int tt_ring_reader_get_latest(struct tt_ring_reader* ctx,
                              struct tt_proto_metrics* out);
int tt_ring_reader_get_history(struct tt_ring_reader* ctx, int level,
                               struct tt_proto_metrics* out, int count);
void tt_ring_reader_close(struct tt_ring_reader* ctx);
const char* tt_ring_reader_strerror(int errcode);

#endif /* TT_RING_READER_H */
