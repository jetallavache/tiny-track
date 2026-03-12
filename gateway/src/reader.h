#ifndef TINYTRACK_READER_H
#define TINYTRACK_READER_H

#include "common/proto/v1.h"
#include "common/ring/reader.h"

/* Wrapper around tt_ring_reader for tinytrack */
struct tt_gateway_reader {
  struct tt_ring_reader ring;
};

int tt_gateway_reader_open(struct tt_gateway_reader* ctx, const char* path);
int tt_gateway_reader_get_latest(struct tt_gateway_reader* ctx,
                                 struct tt_proto_metrics* out);
void tt_gateway_reader_close(struct tt_gateway_reader* ctx);

#endif
