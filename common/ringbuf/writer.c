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
  if (!ctx || !ctx->live_addr)
    return -1;

  size_t cell_size = sizeof(struct tt_proto_metrics);

  struct tt_ring_meta* l1_meta =
      (struct tt_ring_meta*)((uint8_t*)ctx->live_addr + TT_HEADER_SIZE +
                             TT_CONSUMER_TABLE_SIZE);
  uint8_t* l1_data = (uint8_t*)ctx->live_addr + tt_layout_l1_offset();

  struct tt_ring_meta* l2_meta =
      (struct tt_ring_meta*)((uint8_t*)ctx->live_addr +
                             tt_layout_l2_meta_offset(ctx->l1_capacity, cell_size));
  uint8_t* l2_data = (uint8_t*)ctx->live_addr +
                     tt_layout_l2_offset(ctx->l1_capacity, cell_size);

  uint32_t available = l1_meta->head;
  if (available == 0)
    return 0;

  /* Average all available L1 samples (up to capacity) */
  uint32_t n = available < l1_meta->capacity ? available : l1_meta->capacity;

  uint64_t cpu = 0, mem = 0, net_rx = 0, net_tx = 0;
  uint64_t load1 = 0, load5 = 0, load15 = 0;
  uint64_t du_usage = 0, du_total = 0, du_free = 0;
  uint32_t nr_running = 0, nr_total = 0;

  for (uint32_t i = 0; i < n; i++) {
    uint32_t idx = (l1_meta->head - n + i + l1_meta->capacity) % l1_meta->capacity;
    struct tt_proto_metrics* s =
        (struct tt_proto_metrics*)(l1_data + idx * cell_size);
    cpu      += s->cpu_usage;
    mem      += s->mem_usage;
    net_rx   += s->net_rx;
    net_tx   += s->net_tx;
    load1    += s->load_1min;
    load5    += s->load_5min;
    load15   += s->load_15min;
    nr_running += s->nr_running;
    nr_total   += s->nr_total;
    du_usage += s->du_usage;
    du_total += s->du_total_bytes;
    du_free  += s->du_free_bytes;
  }

  struct tt_proto_metrics agg = {0};
  agg.timestamp      = get_timestamp_ms();
  agg.cpu_usage      = (uint16_t)(cpu / n);
  agg.mem_usage      = (uint16_t)(mem / n);
  agg.net_rx         = (uint32_t)(net_rx / n);
  agg.net_tx         = (uint32_t)(net_tx / n);
  agg.load_1min      = (uint16_t)(load1 / n);
  agg.load_5min      = (uint16_t)(load5 / n);
  agg.load_15min     = (uint16_t)(load15 / n);
  agg.nr_running     = nr_running / n;
  agg.nr_total       = nr_total / n;
  agg.du_usage       = (uint16_t)(du_usage / n);
  agg.du_total_bytes = du_total / n;
  agg.du_free_bytes  = du_free / n;

  tt_seqlock_write_begin(&l2_meta->seq);

  uint32_t head = l2_meta->head;
  memcpy(l2_data + head * cell_size, &agg, cell_size);
  l2_meta->last_ts = agg.timestamp;
  if (l2_meta->first_ts == 0)
    l2_meta->first_ts = agg.timestamp;
  l2_meta->head = (head + 1) % l2_meta->capacity;

  tt_seqlock_write_end(&l2_meta->seq);

  return 0;
}

int tt_ring_writer_aggregate_l3(struct tt_ring_writer* ctx) {
  if (!ctx || !ctx->live_addr)
    return -1;

  size_t cell_size = sizeof(struct tt_proto_metrics);

  struct tt_ring_meta* l2_meta =
      (struct tt_ring_meta*)((uint8_t*)ctx->live_addr +
                             tt_layout_l2_meta_offset(ctx->l1_capacity, cell_size));
  uint8_t* l2_data = (uint8_t*)ctx->live_addr +
                     tt_layout_l2_offset(ctx->l1_capacity, cell_size);

  struct tt_ring_meta* l3_meta =
      (struct tt_ring_meta*)((uint8_t*)ctx->live_addr +
                             tt_layout_l3_meta_offset(ctx->l1_capacity,
                                                      ctx->l2_capacity, cell_size));
  uint8_t* l3_data = (uint8_t*)ctx->live_addr +
                     tt_layout_l3_offset(ctx->l1_capacity, ctx->l2_capacity,
                                         cell_size);

  uint32_t available = l2_meta->head;
  if (available == 0)
    return 0;

  uint32_t n = available < l2_meta->capacity ? available : l2_meta->capacity;

  uint64_t cpu = 0, mem = 0, net_rx = 0, net_tx = 0;
  uint64_t load1 = 0, load5 = 0, load15 = 0;
  uint64_t du_usage = 0, du_total = 0, du_free = 0;
  uint32_t nr_running = 0, nr_total = 0;

  for (uint32_t i = 0; i < n; i++) {
    uint32_t idx = (l2_meta->head - n + i + l2_meta->capacity) % l2_meta->capacity;
    struct tt_proto_metrics* s =
        (struct tt_proto_metrics*)(l2_data + idx * cell_size);
    cpu      += s->cpu_usage;
    mem      += s->mem_usage;
    net_rx   += s->net_rx;
    net_tx   += s->net_tx;
    load1    += s->load_1min;
    load5    += s->load_5min;
    load15   += s->load_15min;
    nr_running += s->nr_running;
    nr_total   += s->nr_total;
    du_usage += s->du_usage;
    du_total += s->du_total_bytes;
    du_free  += s->du_free_bytes;
  }

  struct tt_proto_metrics agg = {0};
  agg.timestamp      = get_timestamp_ms();
  agg.cpu_usage      = (uint16_t)(cpu / n);
  agg.mem_usage      = (uint16_t)(mem / n);
  agg.net_rx         = (uint32_t)(net_rx / n);
  agg.net_tx         = (uint32_t)(net_tx / n);
  agg.load_1min      = (uint16_t)(load1 / n);
  agg.load_5min      = (uint16_t)(load5 / n);
  agg.load_15min     = (uint16_t)(load15 / n);
  agg.nr_running     = nr_running / n;
  agg.nr_total       = nr_total / n;
  agg.du_usage       = (uint16_t)(du_usage / n);
  agg.du_total_bytes = du_total / n;
  agg.du_free_bytes  = du_free / n;

  tt_seqlock_write_begin(&l3_meta->seq);

  uint32_t head = l3_meta->head;
  memcpy(l3_data + head * cell_size, &agg, cell_size);
  l3_meta->last_ts = agg.timestamp;
  if (l3_meta->first_ts == 0)
    l3_meta->first_ts = agg.timestamp;
  l3_meta->head = (head + 1) % l3_meta->capacity;

  tt_seqlock_write_end(&l3_meta->seq);

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
