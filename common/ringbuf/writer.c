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

/* Adler32 over buf[0..len), skipping the crc32 field itself (bytes 8..11) */
static uint32_t adler32(const void* buf, size_t len) {
  const uint8_t* p = (const uint8_t*)buf;
  uint32_t a = 1, b = 0;
  for (size_t i = 0; i < len; i++) {
    /* Skip the crc32 field in ttr_header (offset 8, 4 bytes) */
    if (i >= 8 && i < 12) continue;
    a = (a + p[i]) % 65521;
    b = (b + a)    % 65521;
  }
  return (b << 16) | a;
}

static void mark_dirty(struct ttr_writer* ctx, size_t off, size_t len) {
  if (ctx->dirty_min > off)
    ctx->dirty_min = off;
  if (ctx->dirty_max < off + len)
    ctx->dirty_max = off + len;
}

static int shadow_is_valid(const void* shadow_addr, size_t size) {
  const struct ttr_header* hdr = (const struct ttr_header*)shadow_addr;
  if (hdr->magic != TTR_MAGIC)
    return 0;
  if (hdr->version != TTR_VERSION)
    return 0;
  if (hdr->last_update_ts == 0)
    return 0;
  /* Verify checksum if stored and crc enabled */
  if (hdr->crc32 != 0) {
    uint32_t expected = adler32(shadow_addr, size);
    if (hdr->crc32 != expected) {
      tt_log_err("Shadow checksum mismatch: stored=0x%08x computed=0x%08x",
                 hdr->crc32, expected);
      return 0;
    }
  }
  return 1;
}

int ttr_writer_recover_from_shadow(struct ttr_writer* ctx) {
  if (!ctx->live_addr || !ctx->shadow_addr)
    return 0;

  if (!shadow_is_valid(ctx->shadow_addr, ctx->total_size)) {
    tt_log_info("Shadow is not valid, skipping recovery");
    return 0;
  }

  memcpy(ctx->live_addr, ctx->shadow_addr, ctx->total_size);

  /* Update header fields that must reflect the new process */
  struct ttr_header* hdr = (struct ttr_header*)ctx->live_addr;
  hdr->writer_pid = getpid();
  hdr->last_update_ts = get_timestamp_ms();

  /* Mark entire buffer dirty after recovery */
  ctx->dirty_min = 0;
  ctx->dirty_max = ctx->total_size;

  tt_log_notice("Recovered %zu bytes from shadow (last_sync_ts=%llu)",
                ctx->total_size, (unsigned long long)hdr->last_shadow_sync_ts);
  return 1;
}

int ttr_writer_init(struct ttr_writer* ctx, const char* live_path,
                    const char* shadow_path, uint32_t l1_capacity,
                    uint32_t l2_capacity, uint32_t l3_capacity,
                    mode_t file_mode) {
  ctx->l1_capacity = l1_capacity;
  ctx->l2_capacity = l2_capacity;
  ctx->l3_capacity = l3_capacity;
  ctx->file_mode = file_mode;
  /* dirty range: empty state = min > max */
  ctx->dirty_min = SIZE_MAX;
  ctx->dirty_max = 0;

  size_t cell_size = sizeof(struct tt_proto_metrics);
  ctx->total_size =
      tt_layout_total_size(l1_capacity, l2_capacity, l3_capacity, cell_size);

  /* Create live mmap */
  if ((intptr_t)(ctx->live_addr = ttr_shm_create(live_path, ctx->total_size,
                                                 file_mode)) < 0) {
    tt_log_err("Failed to create live mmap (%s)",
               tt_shm_strerror((intptr_t)ctx->live_addr));
    return TTR_WRITER_ERR_LIVE_CREATE;
  }

  /* Create shadow mmap */
  if ((intptr_t)(ctx->shadow_addr = ttr_shm_create(shadow_path, ctx->total_size,
                                                   file_mode)) < 0) {
    tt_log_err("Failed to create shadow mmap (%s)",
               tt_shm_strerror((intptr_t)ctx->shadow_addr));
    ttr_shm_dealloc(ctx->live_addr, ctx->total_size);
    return TTR_WRITER_ERR_SHADOW_CREATE;
  }

  /* Try to recover from shadow before initializing fresh */
  if (ttr_writer_recover_from_shadow(ctx))
    return TTR_WRITER_OK;

  /* Initialize header */
  struct ttr_header* hdr = (struct ttr_header*)ctx->live_addr;
  hdr->magic = TTR_MAGIC;
  hdr->version = TTR_VERSION;
  hdr->writer_pid = getpid();
  hdr->num_consumers = 0;
  hdr->last_update_ts = get_timestamp_ms();
  hdr->last_shadow_sync_ts = get_timestamp_ms();

  /* Initialize L1 metadata */
  struct ttr_meta* l1_meta =
      (struct ttr_meta*)((uint8_t*)ctx->live_addr + TTR_HEADER_SIZE +
                         TTR_CONSUMER_TABLE_SIZE);
  l1_meta->seq = 0;
  l1_meta->head = 0;
  l1_meta->tail = 0;
  l1_meta->capacity = l1_capacity;
  l1_meta->cell_size = cell_size;
  l1_meta->first_ts = 0;
  l1_meta->last_ts = 0;

  /* Initialize L2 metadata */
  struct ttr_meta* l2_meta =
      (struct ttr_meta*)((uint8_t*)ctx->live_addr +
                         ttr_layout_l2_meta_offset(l1_capacity, cell_size));
  l2_meta->seq = 0;
  l2_meta->head = 0;
  l2_meta->tail = 0;
  l2_meta->capacity = l2_capacity;
  l2_meta->cell_size = cell_size;
  l2_meta->first_ts = 0;
  l2_meta->last_ts = 0;

  /* Initialize L3 metadata */
  struct ttr_meta* l3_meta =
      (struct ttr_meta*)((uint8_t*)ctx->live_addr +
                         ttr_layout_l3_meta_offset(l1_capacity, l2_capacity,
                                                   cell_size));
  l3_meta->seq = 0;
  l3_meta->head = 0;
  l3_meta->tail = 0;
  l3_meta->capacity = l3_capacity;
  l3_meta->cell_size = cell_size;
  l3_meta->first_ts = 0;
  l3_meta->last_ts = 0;

  msync(ctx->live_addr, ctx->total_size, MS_SYNC);

  /* Mark entire buffer dirty on fresh init */
  ctx->dirty_min = 0;
  ctx->dirty_max = ctx->total_size;

  return TTR_WRITER_OK;
}

int ttr_writer_write_l1(struct ttr_writer* ctx,
                        struct tt_proto_metrics* sample) {
  if (!ctx || !ctx->live_addr || !sample) {
    tt_log_err("ttr_writer_write_l1: NULL argument (ctx=%p, sample=%p)",
               (void*)ctx, (void*)sample);
    return TTR_WRITER_ERR_NULL;
  }

  size_t cell_size = sizeof(struct tt_proto_metrics);

  struct ttr_header* hdr = (struct ttr_header*)ctx->live_addr;
  hdr->last_update_ts = get_timestamp_ms();

  struct ttr_meta* meta =
      (struct ttr_meta*)((uint8_t*)ctx->live_addr + TTR_HEADER_SIZE +
                         TTR_CONSUMER_TABLE_SIZE);

  uint8_t* data = (uint8_t*)ctx->live_addr + ttr_layout_l1_offset();

  sample->timestamp = hdr->last_update_ts;

  /* Seqlock: begin write */
  ttr_seqlock_write_begin(&meta->seq);

  uint32_t head = meta->head;
  memcpy(data + head * cell_size, sample, cell_size);

  meta->last_ts = sample->timestamp;
  if (meta->first_ts == 0) {
    meta->first_ts = sample->timestamp;
  }

  meta->head = (head + 1) % meta->capacity;

  /* Seqlock: end write */
  ttr_seqlock_write_end(&meta->seq);

  /* Mark header + L1 meta + written cell as dirty */
  mark_dirty(ctx, 0, TTR_HEADER_SIZE);
  mark_dirty(ctx, TTR_HEADER_SIZE + TTR_CONSUMER_TABLE_SIZE, TTR_META_SIZE);
  mark_dirty(ctx, ttr_layout_l1_offset() + head * cell_size, cell_size);

  msync(ctx->live_addr, ctx->total_size, MS_ASYNC);

  return 0;
}

int ttr_writer_aggregate_l2(struct ttr_writer* ctx) {
  if (!ctx || !ctx->live_addr) {
    tt_log_err("ttr_writer_aggregate_l2: NULL ctx or live_addr");
    return TTR_WRITER_ERR_NULL;
  }

  size_t cell_size = sizeof(struct tt_proto_metrics);

  struct ttr_meta* l1_meta =
      (struct ttr_meta*)((uint8_t*)ctx->live_addr + TTR_HEADER_SIZE +
                         TTR_CONSUMER_TABLE_SIZE);
  uint8_t* l1_data = (uint8_t*)ctx->live_addr + ttr_layout_l1_offset();

  struct ttr_meta* l2_meta =
      (struct ttr_meta*)((uint8_t*)ctx->live_addr +
                         ttr_layout_l2_meta_offset(ctx->l1_capacity,
                                                   cell_size));
  uint8_t* l2_data = (uint8_t*)ctx->live_addr +
                     ttr_layout_l2_offset(ctx->l1_capacity, cell_size);

  uint32_t available = l1_meta->head;
  if (available == 0) {
    tt_log_debug("ttr_writer_aggregate_l2: no L1 data yet");
    return TTR_WRITER_ERR_NODATA;
  }

  /* Average all available L1 samples (up to capacity) */
  uint32_t n = available < l1_meta->capacity ? available : l1_meta->capacity;

  uint64_t cpu = 0, mem = 0, net_rx = 0, net_tx = 0;
  uint64_t load1 = 0, load5 = 0, load15 = 0;
  uint64_t du_usage = 0, du_total = 0, du_free = 0;
  uint32_t nr_running = 0, nr_total = 0;

  for (uint32_t i = 0; i < n; i++) {
    uint32_t idx =
        (l1_meta->head - n + i + l1_meta->capacity) % l1_meta->capacity;
    struct tt_proto_metrics* s =
        (struct tt_proto_metrics*)(l1_data + idx * cell_size);
    cpu += s->cpu_usage;
    mem += s->mem_usage;
    net_rx += s->net_rx;
    net_tx += s->net_tx;
    load1 += s->load_1min;
    load5 += s->load_5min;
    load15 += s->load_15min;
    nr_running += s->nr_running;
    nr_total += s->nr_total;
    du_usage += s->du_usage;
    du_total += s->du_total_bytes;
    du_free += s->du_free_bytes;
  }

  struct tt_proto_metrics agg = {0};
  agg.timestamp = get_timestamp_ms();
  agg.cpu_usage = (uint16_t)(cpu / n);
  agg.mem_usage = (uint16_t)(mem / n);
  agg.net_rx = (uint32_t)(net_rx / n);
  agg.net_tx = (uint32_t)(net_tx / n);
  agg.load_1min = (uint16_t)(load1 / n);
  agg.load_5min = (uint16_t)(load5 / n);
  agg.load_15min = (uint16_t)(load15 / n);
  agg.nr_running = nr_running / n;
  agg.nr_total = nr_total / n;
  agg.du_usage = (uint16_t)(du_usage / n);
  agg.du_total_bytes = du_total / n;
  agg.du_free_bytes = du_free / n;

  ttr_seqlock_write_begin(&l2_meta->seq);

  uint32_t head = l2_meta->head;
  memcpy(l2_data + head * cell_size, &agg, cell_size);
  l2_meta->last_ts = agg.timestamp;
  if (l2_meta->first_ts == 0)
    l2_meta->first_ts = agg.timestamp;
  l2_meta->head = (head + 1) % l2_meta->capacity;

  ttr_seqlock_write_end(&l2_meta->seq);

  mark_dirty(ctx, ttr_layout_l2_meta_offset(ctx->l1_capacity, cell_size),
             TTR_META_SIZE);
  mark_dirty(ctx, ttr_layout_l2_offset(ctx->l1_capacity, cell_size) +
                      head * cell_size,
             cell_size);

  return 0;
}

int ttr_writer_aggregate_l3(struct ttr_writer* ctx) {
  if (!ctx || !ctx->live_addr) {
    tt_log_err("ttr_writer_aggregate_l3: NULL ctx or live_addr");
    return TTR_WRITER_ERR_NULL;
  }

  size_t cell_size = sizeof(struct tt_proto_metrics);

  struct ttr_meta* l2_meta =
      (struct ttr_meta*)((uint8_t*)ctx->live_addr +
                         ttr_layout_l2_meta_offset(ctx->l1_capacity,
                                                   cell_size));
  uint8_t* l2_data = (uint8_t*)ctx->live_addr +
                     ttr_layout_l2_offset(ctx->l1_capacity, cell_size);

  struct ttr_meta* l3_meta =
      (struct ttr_meta*)((uint8_t*)ctx->live_addr +
                         ttr_layout_l3_meta_offset(
                             ctx->l1_capacity, ctx->l2_capacity, cell_size));
  uint8_t* l3_data =
      (uint8_t*)ctx->live_addr +
      ttr_layout_l3_offset(ctx->l1_capacity, ctx->l2_capacity, cell_size);

  uint32_t available = l2_meta->head;
  if (available == 0) {
    tt_log_debug("ttr_writer_aggregate_l3: no L2 data yet");
    return TTR_WRITER_ERR_NODATA;
  }

  uint32_t n = available < l2_meta->capacity ? available : l2_meta->capacity;

  uint64_t cpu = 0, mem = 0, net_rx = 0, net_tx = 0;
  uint64_t load1 = 0, load5 = 0, load15 = 0;
  uint64_t du_usage = 0, du_total = 0, du_free = 0;
  uint32_t nr_running = 0, nr_total = 0;

  for (uint32_t i = 0; i < n; i++) {
    uint32_t idx =
        (l2_meta->head - n + i + l2_meta->capacity) % l2_meta->capacity;
    struct tt_proto_metrics* s =
        (struct tt_proto_metrics*)(l2_data + idx * cell_size);
    cpu += s->cpu_usage;
    mem += s->mem_usage;
    net_rx += s->net_rx;
    net_tx += s->net_tx;
    load1 += s->load_1min;
    load5 += s->load_5min;
    load15 += s->load_15min;
    nr_running += s->nr_running;
    nr_total += s->nr_total;
    du_usage += s->du_usage;
    du_total += s->du_total_bytes;
    du_free += s->du_free_bytes;
  }

  struct tt_proto_metrics agg = {0};
  agg.timestamp = get_timestamp_ms();
  agg.cpu_usage = (uint16_t)(cpu / n);
  agg.mem_usage = (uint16_t)(mem / n);
  agg.net_rx = (uint32_t)(net_rx / n);
  agg.net_tx = (uint32_t)(net_tx / n);
  agg.load_1min = (uint16_t)(load1 / n);
  agg.load_5min = (uint16_t)(load5 / n);
  agg.load_15min = (uint16_t)(load15 / n);
  agg.nr_running = nr_running / n;
  agg.nr_total = nr_total / n;
  agg.du_usage = (uint16_t)(du_usage / n);
  agg.du_total_bytes = du_total / n;
  agg.du_free_bytes = du_free / n;

  ttr_seqlock_write_begin(&l3_meta->seq);

  uint32_t head = l3_meta->head;
  memcpy(l3_data + head * cell_size, &agg, cell_size);
  l3_meta->last_ts = agg.timestamp;
  if (l3_meta->first_ts == 0)
    l3_meta->first_ts = agg.timestamp;
  l3_meta->head = (head + 1) % l3_meta->capacity;

  ttr_seqlock_write_end(&l3_meta->seq);

  mark_dirty(ctx,
             ttr_layout_l3_meta_offset(ctx->l1_capacity, ctx->l2_capacity,
                                       cell_size),
             TTR_META_SIZE);
  mark_dirty(ctx,
             ttr_layout_l3_offset(ctx->l1_capacity, ctx->l2_capacity,
                                  cell_size) + head * cell_size,
             cell_size);

  return 0;
}

int ttr_writer_shadow_sync(struct ttr_writer* ctx) {
  if (ctx->dirty_min >= ctx->dirty_max)
    return 0; /* nothing to sync */

  size_t off = ctx->dirty_min;
  size_t len = ctx->dirty_max - ctx->dirty_min;

  memcpy((uint8_t*)ctx->shadow_addr + off,
         (uint8_t*)ctx->live_addr + off, len);

  /* Update last_shadow_sync_ts in both live and shadow headers */
  uint64_t now = get_timestamp_ms();
  ((struct ttr_header*)ctx->live_addr)->last_shadow_sync_ts = now;
  ((struct ttr_header*)ctx->shadow_addr)->last_shadow_sync_ts = now;

  /* Compute and store checksum over the complete shadow */
  if (ctx->enable_crc) {
    uint32_t crc = adler32(ctx->shadow_addr, ctx->total_size);
    ((struct ttr_header*)ctx->shadow_addr)->crc32 = crc;
  } else {
    ((struct ttr_header*)ctx->shadow_addr)->crc32 = 0;
  }

  msync(ctx->shadow_addr, ctx->total_size, MS_SYNC);

  /* Reset dirty range */
  ctx->dirty_min = ctx->total_size;
  ctx->dirty_max = 0;

  return 0;
}

void ttr_writer_cleanup(struct ttr_writer* ctx) {
  if (ctx->live_addr) {
    ttr_shm_dealloc(ctx->live_addr, ctx->total_size);
  }
  if (ctx->shadow_addr) {
    ttr_shm_dealloc(ctx->shadow_addr, ctx->total_size);
  }
}
