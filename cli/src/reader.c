#include "reader.h"

#include "common/ring/reader.h"

int ttc_reader_open(struct ttc_reader* ctx, const char* path) {
  return tt_ring_reader_open(&ctx->ring, path);
}

int ttc_reader_get_latest(struct ttc_reader* ctx,
                          struct tt_proto_metrics* out) {
  return tt_ring_reader_get_latest(&ctx->ring, out);
}

int ttc_reader_get_history(struct ttc_reader* ctx, int level,
                           struct tt_proto_metrics* out, int count) {
  return tt_ring_reader_get_history(&ctx->ring, level, out, count);
}

void ttc_reader_close(struct ttc_reader* ctx) {
  tt_ring_reader_close(&ctx->ring);
}

const char* ttc_reader_strerror(int errcode) {
  return tt_ring_reader_strerror(errcode);
}
