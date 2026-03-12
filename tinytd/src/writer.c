#include "writer.h"

#include "common/ring/writer.h"
#include "common/sink/log.h"

int ttd_writer_init(struct ttd_writer* ctx, struct ttd_config* cfg) {
  int ret = tt_ring_writer_init(&ctx->ring, cfg->live_path, cfg->shadow_path,
                                cfg->l1_capacity, cfg->l2_capacity,
                                cfg->l3_capacity, cfg->file_mode);
  if (ret < 0) {
    tt_log_err("Failed to initialize ring writer");
    return ret;
  }

  tt_log_debug("Writer initialized: live_addr=%p, shadow_addr=%p",
               ctx->ring.live_addr, ctx->ring.shadow_addr);
  return 0;
}

int ttd_writer_write_l1(struct ttd_writer* ctx,
                        struct tt_proto_metrics* sample) {
  if (!ctx || !ctx->ring.live_addr) {
    tt_log_err("Invalid writer state: ctx=%p, live_addr=%p", (void*)ctx,
               ctx ? ctx->ring.live_addr : NULL);
    return -1;
  }
  return tt_ring_writer_write_l1(&ctx->ring, sample);
}

int ttd_writer_aggregate_l2(struct ttd_writer* ctx) {
  return tt_ring_writer_aggregate_l2(&ctx->ring);
}

int ttd_writer_aggregate_l3(struct ttd_writer* ctx) {
  return tt_ring_writer_aggregate_l3(&ctx->ring);
}

int ttd_writer_shadow_sync(struct ttd_writer* ctx) {
  return tt_ring_writer_shadow_sync(&ctx->ring);
}

void ttd_writer_cleanup(struct ttd_writer* ctx) {
  tt_ring_writer_cleanup(&ctx->ring);
}
