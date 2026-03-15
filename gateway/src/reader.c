#include "reader.h"

#include "common/ringbuf.h"

int ttg_reader_open(struct ttg_reader* ctx, const char* path) {
  return ttr_reader_open(&ctx->ring, path);
}

int ttg_reader_get_latest(struct ttg_reader* ctx,
                          struct tt_metrics* out) {
  return ttr_reader_get_latest(&ctx->ring, out, sizeof(*out));
}

void ttg_reader_close(struct ttg_reader* ctx) {
  ttr_reader_close(&ctx->ring);
}
