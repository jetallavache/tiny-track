#include "reader.h"

#include <string.h>
#include <time.h>
#include <unistd.h>

#include "common/sink/log.h"
#include "layout.h"
#include "shm.h"

int tt_ring_reader_open(struct tt_ring_reader* ctx, const char* path) {
  if ((intptr_t)(ctx->addr = tt_shm_read(path, &ctx->size)) < 0) {
    tt_log_err("Failed to read mmap (%s)", tt_shm_err((intptr_t)ctx->addr));
    return TT_READER_ERR_READ;
  }

  struct tt_ring_header* hdr = (struct tt_ring_header*)ctx->addr;
  if (hdr->magic != TT_MAGIC) {
    tt_shm_dealloc(ctx->addr, ctx->size);
    return TT_READER_ERR_MAGIC;
  }

  if (hdr->version != TT_VERSION) {
    tt_shm_dealloc(ctx->addr, ctx->size);
    return TT_READER_ERR_VERSION;
  }

  ctx->l1_meta = (struct tt_ring_meta*)((uint8_t*)ctx->addr + TT_HEADER_SIZE +
                                        TT_CONSUMER_TABLE_SIZE);
  ctx->l1_data = (uint8_t*)ctx->addr + tt_layout_l1_offset();

  ctx->l2_meta =
      (struct tt_ring_meta*)((uint8_t*)ctx->addr +
                             tt_layout_l2_meta_offset(ctx->l1_meta->capacity,
                                                      ctx->l1_meta->cell_size));
  ctx->l2_data =
      (uint8_t*)ctx->addr +
      tt_layout_l2_offset(ctx->l1_meta->capacity, ctx->l1_meta->cell_size);

  ctx->l3_meta =
      (struct tt_ring_meta*)((uint8_t*)ctx->addr +
                             tt_layout_l3_meta_offset(ctx->l1_meta->capacity,
                                                      ctx->l2_meta->capacity,
                                                      ctx->l1_meta->cell_size));
  ctx->l3_data =
      (uint8_t*)ctx->addr + tt_layout_l3_offset(ctx->l1_meta->capacity,
                                                ctx->l2_meta->capacity,
                                                ctx->l1_meta->cell_size);

  return TT_READER_OK;
}

int tt_ring_reader_get_latest(struct tt_ring_reader* ctx,
                              struct tt_proto_metrics* out) {
  if (!ctx->l1_meta)
    return TT_READER_ERR_INVALID;

  struct tt_ring_header* hdr = (struct tt_ring_header*)ctx->addr;
  uint64_t now_ms = time(NULL) * 1000;

  if (now_ms - hdr->last_update_ts > 3000) {
    return TT_READER_ERR_STALE;
  }

  uint32_t head = ctx->l1_meta->head;
  if (head == 0)
    return TT_READER_ERR_NODATA;

  uint32_t last_idx =
      (head - 1 + ctx->l1_meta->capacity) % ctx->l1_meta->capacity;

  memcpy(out, ctx->l1_data + last_idx * ctx->l1_meta->cell_size,
         sizeof(struct tt_proto_metrics));

  return TT_READER_OK;
}

int tt_ring_reader_get_history(struct tt_ring_reader* ctx, int level,
                               struct tt_proto_metrics* out, int count) {
  struct tt_ring_meta* meta;
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
      return TT_READER_ERR_INVALID;
  }

  if (!meta)
    return TT_READER_ERR_INVALID;

  uint32_t head = meta->head;
  uint32_t available = head;

  if (available == 0)
    return TT_READER_ERR_NODATA;
  if ((uint32_t)count > available)
    count = available;

  for (int i = 0; i < count; i++) {
    uint32_t idx = (head - count + i + meta->capacity) % meta->capacity;
    memcpy(&out[i], data + idx * meta->cell_size,
           sizeof(struct tt_proto_metrics));
  }

  return count;
}

void tt_ring_reader_close(struct tt_ring_reader* ctx) {
  if (ctx->addr) {
    tt_shm_dealloc(ctx->addr, ctx->size);
    ctx->addr = NULL;
  }
}

const char* tt_ring_reader_strerror(int errcode) {
  switch (errcode) {
    case TT_READER_OK:
      return "Success";
    case TT_READER_ERR_READ:
      return "Error opening mmap-area";
    case TT_READER_ERR_MAGIC:
      return "Invalid magic number";
    case TT_READER_ERR_VERSION:
      return "Unsupported version";
    case TT_READER_ERR_NODATA:
      return "No data available";
    case TT_READER_ERR_INVALID:
      return "Invalid parameters";
    case TT_READER_ERR_STALE:
      return "Data is stale (daemon not running)";
    default:
      return "Unknown error";
  }
}
