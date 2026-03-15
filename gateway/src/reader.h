#ifndef TINYTRACK_READER_H
#define TINYTRACK_READER_H

#include "common/proto/v1.h"
#include "common/ringbuf.h"

/* Wrapper around ttr_reader for tinytrack */
struct ttg_reader {
  struct ttr_reader ring;
};

int ttg_reader_open(struct ttg_reader* ctx, const char* path);
int ttg_reader_get_latest(struct ttg_reader* ctx, struct tt_metrics* out);
void ttg_reader_close(struct ttg_reader* ctx);

#endif
