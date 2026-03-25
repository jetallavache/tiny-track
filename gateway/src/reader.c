#include "reader.h"

#include <arpa/inet.h>

#include "common/ringbuf.h"
#include "common/ringbuf/layout.h"

int ttg_reader_open(struct ttg_reader* ctx, const char* path) {
  return ttr_reader_open(&ctx->ring, path);
}

int ttg_reader_get_latest(struct ttg_reader* ctx, struct tt_metrics* out) {
  return ttr_reader_get_latest(&ctx->ring, out, sizeof(*out));
}

int ttg_reader_get_history(struct ttg_reader* ctx, uint8_t level,
                           struct tt_metrics* out, int count) {
  /* ttr_reader_get_history uses int level: 1/2/3 matching RING_LEVEL_* */
  return ttr_reader_get_history(&ctx->ring, (int)level, out,
                                sizeof(struct tt_metrics), count);
}

int ttg_reader_get_stats(struct ttg_reader* ctx, uint8_t level,
                         struct tt_proto_ring_stat* out) {
  struct ttr_meta* meta;
  switch (level) {
    case RING_LEVEL_L1: meta = ctx->ring.l1_meta; break;
    case RING_LEVEL_L2: meta = ctx->ring.l2_meta; break;
    case RING_LEVEL_L3: meta = ctx->ring.l3_meta; break;
    default: return -1;
  }
  if (!meta) return -1;

  out->level    = level;
  out->capacity = htonl(meta->capacity);
  out->head     = htonl(meta->head);
  out->filled   = htonl(meta->head < meta->capacity ? meta->head
                                                     : meta->capacity);
  out->first_ts = meta->first_ts; /* already ms, no hton needed for uint64 — handled by caller */
  out->last_ts  = meta->last_ts;
  return 0;
}

void ttg_reader_close(struct ttg_reader* ctx) {
  ttr_reader_close(&ctx->ring);
}
