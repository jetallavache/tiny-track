#include "reader.h"

#include <arpa/inet.h>
#include <stdio.h>
#include <string.h>
#include <sys/utsname.h>
#include <unistd.h>

#include "common/ringbuf.h"
#include "common/ringbuf/layout.h"

int ttg_reader_open(struct ttg_reader* ctx, const char* path) {
  return ttr_reader_open(&ctx->ring, path);
}

int ttg_reader_get_latest(struct ttg_reader* ctx, struct tt_metrics* out) {
  return ttr_reader_get_latest(&ctx->ring, out, sizeof(*out));
}

int ttg_reader_get_history(struct ttg_reader* ctx, uint8_t level,
                           struct tt_metrics* out, int count) {
  /* ttr_reader_get_history uses int level: 1/2/3 matching RING_LEVEL_* */
  return ttr_reader_get_history(&ctx->ring, (int)level, out,
                                sizeof(struct tt_metrics), count);
}

int ttg_reader_get_stats(struct ttg_reader* ctx, uint8_t level,
                         struct tt_proto_ring_stat* out) {
  struct ttr_meta* meta;
  switch (level) {
    case RING_LEVEL_L1:
      meta = ctx->ring.l1_meta;
      break;
    case RING_LEVEL_L2:
      meta = ctx->ring.l2_meta;
      break;
    case RING_LEVEL_L3:
      meta = ctx->ring.l3_meta;
      break;
    default:
      return -1;
  }
  if (!meta)
    return -1;

  out->level = level;
  out->capacity = htonl(meta->capacity);
  out->head = htonl(meta->head);
  out->filled =
      htonl(meta->head < meta->capacity ? meta->head : meta->capacity);
  out->first_ts = meta->first_ts; /* already ms, no hton needed for uint64 —
                                     handled by caller */
  out->last_ts = meta->last_ts;
  return 0;
}

void ttg_reader_close(struct ttg_reader* ctx) {
  ttr_reader_close(&ctx->ring);
}

int ttg_reader_get_sysinfo(struct ttg_reader* ctx,
                           struct tt_proto_sysinfo* out) {
  memset(out, 0, sizeof(*out));

  /* hostname */
  gethostname(out->hostname, sizeof(out->hostname) - 1);

  /* OS string: "Linux 6.1.0 #1 SMP ..." */
  struct utsname u;
  if (uname(&u) == 0)
    snprintf(out->os_type, sizeof(out->os_type), "%s %s", u.sysname, u.release);

  /* uptime from /proc/uptime */
  FILE* f = fopen("/proc/uptime", "r");
  if (f) {
    double up = 0;
    fscanf(f, "%lf", &up);
    fclose(f);
    out->uptime_sec = htobe64((uint64_t)up);
  }

  /* ring capacities from shm metadata */
  if (ctx->ring.l1_meta)
    out->slots_l1 = htonl(ctx->ring.l1_meta->capacity);
  if (ctx->ring.l2_meta)
    out->slots_l2 = htonl(ctx->ring.l2_meta->capacity);
  if (ctx->ring.l3_meta)
    out->slots_l3 = htonl(ctx->ring.l3_meta->capacity);

  /* interval from ring header (writer_pid field not useful; use defaults) */
  out->interval_ms =
      htonl(1000); /* daemon default; TODO: read from shm header */
  out->agg_l2_ms = htonl(60000);  /* L1→L2: 1 min */
  out->agg_l3_ms = htonl(900000); /* L2→L3: 15 min */

  return 0;
}
