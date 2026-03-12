#include "reader.h"

#include "common/ring/reader.h"

int tt_gateway_reader_open(struct tt_gateway_reader* ctx, const char* path) {
  return tt_ring_reader_open(&ctx->ring, path);
}

int tt_gateway_reader_get_latest(struct tt_gateway_reader* ctx,
                                 struct tt_proto_metrics* out) {
  return tt_ring_reader_get_latest(&ctx->ring, out);
}

void tt_gateway_reader_close(struct tt_gateway_reader* ctx) {
  tt_ring_reader_close(&ctx->ring);
}
