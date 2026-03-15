#ifndef TINY_CLI_READER_H
#define TINY_CLI_READER_H

#include "common/proto/v1.h"
#include "common/ringbuf.h"

/* Wrapper around tt_ring_reader for tiny-cli */
struct ttc_reader {
  struct tt_ring_reader ring;
};

int ttc_reader_open(struct ttc_reader* ctx, const char* path);
int ttc_reader_get_latest(struct ttc_reader* ctx, struct tt_proto_metrics* out);
int ttc_reader_get_history(struct ttc_reader* ctx, int level,
                           struct tt_proto_metrics* out, int count);
void ttc_reader_close(struct ttc_reader* ctx);
const char* ttc_reader_strerror(int errcode);

#endif
