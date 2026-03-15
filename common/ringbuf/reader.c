#include "reader.h"

#include <string.h>
#include <time.h>
#include <unistd.h>

#include "common/log.h"
#include "layout.h"
#include "seqlock.h"
#include "shm.h"

int ttr_reader_open(struct ttr_reader* ctx, const char* path) {
  if (!ctx || !path) {
    tt_log_err("ttr_reader_open: NULL argument");
    return TTR_READER_ERR_INVALID;
  }
  if ((intptr_t)(ctx->addr = ttr_shm_read(path, &ctx->size)) < 0) {
    tt_log_err("Failed to read mmap (%s)",
               tt_shm_errorstr((intptr_t)ctx->addr));
    return TTR_READER_ERR_READ;
  }

  struct ttr_header* hdr = (struct ttr_header*)ctx->addr;
  if (hdr->magic != TTR_MAGIC) {
    ttr_shm_dealloc(ctx->addr, ctx->size);
    return TTR_READER_ERR_MAGIC;
  }

  if (hdr->version != TTR_VERSION) {
    ttr_shm_dealloc(ctx->addr, ctx->size);
    return TTR_READER_ERR_VERSION;
  }

  ctx->l1_meta = (struct ttr_meta*)((uint8_t*)ctx->addr + TTR_HEADER_SIZE +
                                    TTR_CONSUMER_TABLE_SIZE);
  ctx->l1_data = (uint8_t*)ctx->addr + ttr_layout_l1_offset();

  ctx->l2_meta =
      (struct ttr_meta*)((uint8_t*)ctx->addr +
                         ttr_layout_l2_meta_offset(ctx->l1_meta->capacity,
                                                   ctx->l1_meta->cell_size));
  ctx->l2_data =
      (uint8_t*)ctx->addr +
      ttr_layout_l2_offset(ctx->l1_meta->capacity, ctx->l1_meta->cell_size);

  ctx->l3_meta =
      (struct ttr_meta*)((uint8_t*)ctx->addr +
                         ttr_layout_l3_meta_offset(ctx->l1_meta->capacity,
                                                   ctx->l2_meta->capacity,
                                                   ctx->l1_meta->cell_size));
  ctx->l3_data =
      (uint8_t*)ctx->addr + ttr_layout_l3_offset(ctx->l1_meta->capacity,
                                                 ctx->l2_meta->capacity,
                                                 ctx->l1_meta->cell_size);

  return TTR_READER_OK;
}

int ttr_reader_get_latest(struct ttr_reader* ctx,
                          struct tt_proto_metrics* out) {
  if (!ctx || !out) {
    tt_log_err("ttr_reader_get_latest: NULL argument");
    return TTR_READER_ERR_INVALID;
  }
  if (!ctx->l1_meta)
    return TTR_READER_ERR_INVALID;

  struct ttr_header* hdr = (struct ttr_header*)ctx->addr;
  uint64_t now_ms = time(NULL) * 1000;

  if (now_ms - hdr->last_update_ts > 3000) {
    return TTR_READER_ERR_STALE;
  }

  /* Seqlock: read with retry */
  uint32_t seq;
  do {
    seq = ttr_seqlock_read_begin(&ctx->l1_meta->seq);

    uint32_t head = ctx->l1_meta->head;
    if (head == 0)
      return TTR_READER_ERR_NODATA;

    uint32_t last_idx =
        (head - 1 + ctx->l1_meta->capacity) % ctx->l1_meta->capacity;

    memcpy(out, ctx->l1_data + last_idx * ctx->l1_meta->cell_size,
           sizeof(struct tt_proto_metrics));

  } while (ttr_seqlock_read_retry(&ctx->l1_meta->seq, seq));

  return TTR_READER_OK;
}

int ttr_reader_get_history(struct ttr_reader* ctx, int level,
                           struct tt_proto_metrics* out, int count) {
  if (!ctx || !out) {
    tt_log_err("ttr_reader_get_history: NULL argument");
    return TTR_READER_ERR_INVALID;
  }
  if (count <= 0)
    return TTR_READER_ERR_INVALID;
  struct ttr_meta* meta;
  uint8_t* data;

  switch (level) {
    case 1:
      meta = ctx->l1_meta;
      data = ctx->l1_data;
      break;
    case 2:
      meta = ctx->l2_meta;
      data = ctx->l2_data;
      break;
    case 3:
      meta = ctx->l3_meta;
      data = ctx->l3_data;
      break;
    default:
      return TTR_READER_ERR_INVALID;
  }

  if (!meta)
    return TTR_READER_ERR_INVALID;

  /* Seqlock: read with retry */
  uint32_t seq;
  int actual_count;
  do {
    seq = ttr_seqlock_read_begin(&meta->seq);

    uint32_t head = meta->head;
    uint32_t available = head;

    if (available == 0)
      return TTR_READER_ERR_NODATA;
    if ((uint32_t)count > available)
      count = available;

    for (int i = 0; i < count; i++) {
      uint32_t idx = (head - count + i + meta->capacity) % meta->capacity;
      memcpy(&out[i], data + idx * meta->cell_size,
             sizeof(struct tt_proto_metrics));
    }

    actual_count = count;

  } while (ttr_seqlock_read_retry(&meta->seq, seq));

  return actual_count;
}

void ttr_reader_close(struct ttr_reader* ctx) {
  if (!ctx)
    return;
  if (ctx->addr) {
    ttr_shm_dealloc(ctx->addr, ctx->size);
    ctx->addr = NULL;
  }
}

const char* ttr_reader_strerror(int errcode) {
  switch (errcode) {
    case TTR_READER_OK:
      return "Success";
    case TTR_READER_ERR_READ:
      return "Error opening mmap-area";
    case TTR_READER_ERR_MAGIC:
      return "Invalid magic number";
    case TTR_READER_ERR_VERSION:
      return "Unsupported version";
    case TTR_READER_ERR_NODATA:
      return "No data available";
    case TTR_READER_ERR_INVALID:
      return "Invalid parameters";
    case TTR_READER_ERR_STALE:
      return "Data is stale (daemon not running)";
    default:
      return "Unknown error";
  }
}
