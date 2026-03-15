#include "writer.h"

#include "common/log.h"
#include "common/metrics.h"
#include "common/ringbuf.h"
#include "common/ringbuf/layout.h"
#include "debug.h"

int ttd_writer_init(struct ttd_writer* ctx, struct ttd_config* cfg) {
  struct ttr_writer_config ring_cfg = {
    .live_path   = cfg->live_path,
    .shadow_path = cfg->shadow_path,
    .l1_capacity = cfg->l1_capacity,
    .l2_capacity = cfg->l2_capacity,
    .l3_capacity = cfg->l3_capacity,
    .cell_size   = sizeof(struct tt_metrics),
    .file_mode   = cfg->file_mode,
    .aggregate   = tt_metrics_aggregate,
  };
  int ret = ttr_writer_init(&ctx->ring, &ring_cfg);
  if (ret < 0) {
    tt_log_err("Failed to initialize ring writer");
    return ret;
  }

  ctx->ring.enable_crc = cfg->enable_crc;
  tt_log_debug("Writer initialized: live_addr=%p, shadow_addr=%p, crc=%s",
               ctx->ring.live_addr, ctx->ring.shadow_addr,
               cfg->enable_crc ? "on" : "off");
  return 0;
}

int ttd_writer_write_l1(struct ttd_writer* ctx,
                        struct tt_metrics* sample) {
  if (!ctx || !ctx->ring.live_addr) {
    tt_log_err("Invalid writer state: ctx=%p, live_addr=%p", (void*)ctx,
               ctx ? ctx->ring.live_addr : NULL);
    return -1;
  }
  return ttr_writer_write_l1(&ctx->ring, sample);
}
int ttd_writer_aggregate_l2(struct ttd_writer* ctx) {
  int ret = ttr_writer_aggregate_l2(&ctx->ring);
#ifdef TTD_DEBUG
  if (ret == 0) {
    size_t cell_size = sizeof(struct tt_metrics);
    struct ttr_meta* l2_meta =
        (struct ttr_meta*)((uint8_t*)ctx->ring.live_addr +
                           ttr_layout_l2_meta_offset(ctx->ring.l1_capacity,
                                                     cell_size));
    uint8_t* l2_data = (uint8_t*)ctx->ring.live_addr +
                       ttr_layout_l2_offset(ctx->ring.l1_capacity, cell_size);
    uint32_t head = l2_meta->head;
    uint32_t prev = (head == 0 ? l2_meta->capacity : head) - 1;
    const struct tt_metrics* agg =
        (const struct tt_metrics*)(l2_data + prev * cell_size);
    ttd_debug_dump_agg(2, agg, head, l2_meta->capacity);
  }
#endif
  return ret;
}

int ttd_writer_aggregate_l3(struct ttd_writer* ctx) {
  int ret = ttr_writer_aggregate_l3(&ctx->ring);
#ifdef TTD_DEBUG
  if (ret == 0) {
    size_t cell_size = sizeof(struct tt_metrics);
    struct ttr_meta* l3_meta =
        (struct ttr_meta*)((uint8_t*)ctx->ring.live_addr +
                           ttr_layout_l3_meta_offset(ctx->ring.l1_capacity,
                                                     ctx->ring.l2_capacity,
                                                     cell_size));
    uint8_t* l3_data = (uint8_t*)ctx->ring.live_addr +
                       ttr_layout_l3_offset(ctx->ring.l1_capacity,
                                            ctx->ring.l2_capacity, cell_size);
    uint32_t head = l3_meta->head;
    uint32_t prev = (head == 0 ? l3_meta->capacity : head) - 1;
    const struct tt_metrics* agg =
        (const struct tt_metrics*)(l3_data + prev * cell_size);
    ttd_debug_dump_agg(3, agg, head, l3_meta->capacity);
  }
#endif
  return ret;
}

int ttd_writer_shadow_sync(struct ttd_writer* ctx) {
  return ttr_writer_shadow_sync(&ctx->ring);
}

void ttd_writer_cleanup(struct ttd_writer* ctx) {
  ttr_writer_cleanup(&ctx->ring);
}
