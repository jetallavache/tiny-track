#include "reader.h"

#include "common/ringbuf.h"

int ttc_reader_open(struct ttc_reader* ctx, const char* path) {
  return ttr_reader_open(&ctx->ring, path);
}

int ttc_reader_get_latest(struct ttc_reader* ctx, struct tt_metrics* out) {
  return ttr_reader_get_latest(&ctx->ring, out, sizeof(*out));
}

int ttc_reader_get_history(struct ttc_reader* ctx, int level, struct tt_metrics* out, int count) {
  return ttr_reader_get_history(&ctx->ring, level, out, sizeof(*out), count);
}

void ttc_reader_close(struct ttc_reader* ctx) { ttr_reader_close(&ctx->ring); }

const char* ttc_reader_strerror(int errcode) { return ttr_reader_strerror(errcode); }
