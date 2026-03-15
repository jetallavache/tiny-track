#include "reader.h"

#include "common/ringbuf.h"

int ttg_reader_open(struct ttg_reader* ctx, const char* path) {
  return tt_ring_reader_open(&ctx->ring, path);
}

int ttg_reader_get_latest(struct ttg_reader* ctx,
                                 struct tt_proto_metrics* out) {
  return tt_ring_reader_get_latest(&ctx->ring, out);
}

void ttg_reader_close(struct ttg_reader* ctx) {
  tt_ring_reader_close(&ctx->ring);
}
