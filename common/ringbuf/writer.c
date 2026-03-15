#include "writer.h"

#include <string.h>
#include <sys/mman.h>
#include <time.h>
#include <unistd.h>

#include "common/log.h"
#include "layout.h"
#include "seqlock.h"
#include "shm.h"

static uint64_t get_timestamp_ms(void) {
  struct timespec ts;
  clock_gettime(CLOCK_REALTIME, &ts);
  return (uint64_t)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

int tt_ring_writer_init(struct tt_ring_writer* ctx, const char* live_path,
                        const char* shadow_path, uint32_t l1_capacity,
                        uint32_t l2_capacity, uint32_t l3_capacity,
                        mode_t file_mode) {
  ctx->l1_capacity = l1_capacity;
  ctx->l2_capacity = l2_capacity;
  ctx->l3_capacity = l3_capacity;
  ctx->file_mode = file_mode;

  size_t cell_size = sizeof(struct tt_proto_metrics);
  ctx->total_size =
      tt_layout_total_size(l1_capacity, l2_capacity, l3_capacity, cell_size);

  /* Create live mmap */
  if ((intptr_t)(ctx->live_addr = tt_shm_create(live_path, ctx->total_size,
                                                file_mode)) < 0) {
    tt_log_err("Failed to create live mmap (%s)",
               tt_shm_error_code_str((intptr_t)ctx->live_addr));
    return TT_WRITER_ERR_LIVE_CREATE;
  }

  /* Create shadow mmap */
  if ((intptr_t)(ctx->shadow_addr = tt_shm_create(shadow_path, ctx->total_size,
                                                  file_mode)) < 0) {
    tt_log_err("Failed to create shadow mmap (%s)",
               tt_shm_error_code_str((intptr_t)ctx->shadow_addr));
    tt_shm_dealloc(ctx->live_addr, ctx->total_size);
    return TT_WRITER_ERR_SHADOW_CREATE;
  }

  /* Initialize header */
  struct tt_ring_header* hdr = (struct tt_ring_header*)ctx->live_addr;
  hdr->magic = TT_MAGIC;
  hdr->version = TT_VERSION;
  hdr->writer_pid = getpid();
  hdr->num_consumers = 0;
  hdr->last_update_ts = get_timestamp_ms();
  hdr->last_shadow_sync_ts = get_timestamp_ms();

  /* Initialize L1 metadata */
  struct tt_ring_meta* l1_meta =
      (struct tt_ring_meta*)((uint8_t*)ctx->live_addr + TT_HEADER_SIZE +
                             TT_CONSUMER_TABLE_SIZE);
  l1_meta->seq = 0;
  l1_meta->head = 0;
  l1_meta->tail = 0;
  l1_meta->capacity = l1_capacity;
  l1_meta->cell_size = cell_size;
  l1_meta->first_ts = 0;
  l1_meta->last_ts = 0;

  /* Initialize L2 metadata */
  struct tt_ring_meta* l2_meta =
      (struct tt_ring_meta*)((uint8_t*)ctx->live_addr +
                             tt_layout_l2_meta_offset(l1_capacity, cell_size));
  l2_meta->seq = 0;
  l2_meta->head = 0;
  l2_meta->tail = 0;
  l2_meta->capacity = l2_capacity;
  l2_meta->cell_size = cell_size;
  l2_meta->first_ts = 0;
  l2_meta->last_ts = 0;

  /* Initialize L3 metadata */
  struct tt_ring_meta* l3_meta =
      (struct tt_ring_meta*)((uint8_t*)ctx->live_addr +
                             tt_layout_l3_meta_offset(l1_capacity, l2_capacity,
                                                      cell_size));
  l3_meta->seq = 0;
  l3_meta->head = 0;
  l3_meta->tail = 0;
  l3_meta->capacity = l3_capacity;
  l3_meta->cell_size = cell_size;
  l3_meta->first_ts = 0;
  l3_meta->last_ts = 0;

  msync(ctx->live_addr, ctx->total_size, MS_SYNC);

  return TT_WRITER_OK;
}

int tt_ring_writer_write_l1(struct tt_ring_writer* ctx,
                            struct tt_proto_metrics* sample) {
  if (!ctx || !ctx->live_addr || !sample) {
    return -1;
  }

  volatile uint8_t test = *((uint8_t*)ctx->live_addr);
  (void)test;

  size_t cell_size = sizeof(struct tt_proto_metrics);

  struct tt_ring_header* hdr = (struct tt_ring_header*)ctx->live_addr;
  hdr->last_update_ts = get_timestamp_ms();

  struct tt_ring_meta* meta =
      (struct tt_ring_meta*)((uint8_t*)ctx->live_addr + TT_HEADER_SIZE +
                             TT_CONSUMER_TABLE_SIZE);

  uint8_t* data = (uint8_t*)ctx->live_addr + tt_layout_l1_offset();

  sample->timestamp = hdr->last_update_ts;

  /* Seqlock: begin write */
  tt_seqlock_write_begin(&meta->seq);

  uint32_t head = meta->head;
  memcpy(data + head * cell_size, sample, cell_size);

  meta->last_ts = sample->timestamp;
  if (meta->first_ts == 0) {
    meta->first_ts = sample->timestamp;
  }

  meta->head = (head + 1) % meta->capacity;

  /* Seqlock: end write */
  tt_seqlock_write_end(&meta->seq);

  msync(ctx->live_addr, ctx->total_size, MS_ASYNC);

  return 0;
}

int tt_ring_writer_aggregate_l2(struct tt_ring_writer* ctx) {
  (void)ctx;
  return 0;
}

int tt_ring_writer_aggregate_l3(struct tt_ring_writer* ctx) {
  (void)ctx;
  return 0;
}

int tt_ring_writer_shadow_sync(struct tt_ring_writer* ctx) {
  memcpy(ctx->shadow_addr, ctx->live_addr, ctx->total_size);
  msync(ctx->shadow_addr, ctx->total_size, MS_SYNC);

  struct tt_ring_header* hdr = (struct tt_ring_header*)ctx->live_addr;
  hdr->last_shadow_sync_ts = get_timestamp_ms();

  return 0;
}

void tt_ring_writer_cleanup(struct tt_ring_writer* ctx) {
  if (ctx->live_addr) {
    tt_shm_dealloc(ctx->live_addr, ctx->total_size);
  }
  if (ctx->shadow_addr) {
    tt_shm_dealloc(ctx->shadow_addr, ctx->total_size);
  }
}
