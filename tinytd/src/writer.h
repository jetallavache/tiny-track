#ifndef TTD_WRITER_H
#define TTD_WRITER_H

#include "common/proto/v1.h"
#include "common/ringbuf.h"
#include "config.h"

/* Wrapper around tt_ring_writer for tinytd */
struct ttd_writer {
  struct tt_ring_writer ring;
};

int ttd_writer_init(struct ttd_writer* ctx, struct ttd_config* cfg);
int ttd_writer_write_l1(struct ttd_writer* ctx,
                        struct tt_proto_metrics* sample);
int ttd_writer_aggregate_l2(struct ttd_writer* ctx);
int ttd_writer_aggregate_l3(struct ttd_writer* ctx);
int ttd_writer_shadow_sync(struct ttd_writer* ctx);
void ttd_writer_cleanup(struct ttd_writer* ctx);

#endif /* TTD_WRITER_H */
