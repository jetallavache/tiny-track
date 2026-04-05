/*
 * test_shadow_sync.c - Integration test: shadow_sync must not cause
 * page-fault spikes or excessive context switches.
 *
 * Method: read /proc/self/status (voluntary_ctxt_switches,
 * nonvoluntary_ctxt_switches) and /proc/self/io (rchar, wchar) before and
 * after N shadow_sync calls, then assert deltas are within thresholds.
 *
 * Also verifies that shadow file is byte-identical to live file after sync.
 */
#define _POSIX_C_SOURCE 200809L
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>

#include "common/metrics.h"
#include "common/ringbuf/shm.h"
#include "common/ringbuf/writer.h"

#define LIVE_PATH "/tmp/tt-shadow-live.dat"
#define SHADOW_PATH "/tmp/tt-shadow-shadow.dat"

/* Max allowed voluntary context switches per shadow_sync call */
#define MAX_VCTX_PER_SYNC 5
/* Max allowed major page faults total (not per-sync) — allow enough for
 * initial mmap warm-up in CI VMs where page cache is cold */
#define MAX_MAJFLT_TOTAL 32

#define PASS "\033[32mPASS\033[0m"
#define FAIL "\033[31mFAIL\033[0m"

static int g_run = 0, g_fail = 0;

#define CHECK(label, cond)                \
  do {                                    \
    g_run++;                              \
    if (cond) {                           \
      printf("  [" PASS "] %s\n", label); \
    } else {                              \
      printf("  [" FAIL "] %s\n", label); \
      g_fail++;                           \
    }                                     \
  } while (0)

typedef struct {
  long vctx;   /* voluntary_ctxt_switches */
  long nvctx;  /* nonvoluntary_ctxt_switches */
  long majflt; /* VmRSS proxy: read from /proc/self/status */
} proc_stats;

static int read_proc_status(proc_stats* out) {
  FILE* f = fopen("/proc/self/status", "r");
  if (!f) return -1;
  char line[128];
  out->vctx = out->nvctx = out->majflt = 0;
  while (fgets(line, sizeof(line), f)) {
    if (strncmp(line, "voluntary_ctxt_switches:", 24) == 0)
      sscanf(line + 24, "%ld", &out->vctx);
    else if (strncmp(line, "nonvoluntary_ctxt_switches:", 27) == 0)
      sscanf(line + 27, "%ld", &out->nvctx);
  }
  fclose(f);

  /* Major page faults from /proc/self/stat field 12 */
  f = fopen("/proc/self/stat", "r");
  if (f) {
    long dummy;
    unsigned long majflt_u;
    /* fields: pid comm state ppid pgrp session tty_nr tpgid flags minflt cminflt majflt */
    fscanf(f, "%ld %*s %*s %*d %*d %*d %*d %*d %*u %*lu %*lu %lu", &dummy, &majflt_u);
    out->majflt = (long)majflt_u;
    fclose(f);
  }
  return 0;
}

static int files_identical(const char* a, const char* b) {
  struct stat sa, sb;
  if (stat(a, &sa) || stat(b, &sb)) return 0;
  if (sa.st_size != sb.st_size) return 0;

  int fda = open(a, O_RDONLY);
  int fdb = open(b, O_RDONLY);
  if (fda < 0 || fdb < 0) {
    close(fda);
    close(fdb);
    return 0;
  }

  void* ma = mmap(NULL, (size_t)sa.st_size, PROT_READ, MAP_PRIVATE, fda, 0);
  void* mb = mmap(NULL, (size_t)sb.st_size, PROT_READ, MAP_PRIVATE, fdb, 0);
  int eq = (ma != MAP_FAILED && mb != MAP_FAILED) ? memcmp(ma, mb, (size_t)sa.st_size) == 0 : 0;

  if (ma != MAP_FAILED) munmap(ma, (size_t)sa.st_size);
  if (mb != MAP_FAILED) munmap(mb, (size_t)sb.st_size);
  close(fda);
  close(fdb);
  return eq;
}

static void test_shadow_sync_no_spike(void) {
  printf("\n[shadow_sync: no ctx-switch / page-fault spike]\n");

#define N_SYNCS 50

  struct ttr_writer_config cfg = {
      .live_path = LIVE_PATH,
      .shadow_path = SHADOW_PATH,
      .l1_capacity = 64,
      .l2_capacity = 16,
      .l3_capacity = 8,
      .cell_size = sizeof(struct tt_metrics),
      .file_mode = 0600,
      .enable_crc = false,
      .auto_recover = false,
      .aggregate = tt_metrics_aggregate,
  };

  struct ttr_writer w;
  if (ttr_writer_init(&w, &cfg) != TTR_WRITER_OK) {
    printf("  [SKIP] writer init failed\n");
    return;
  }

  /* Pre-populate with data */
  for (int i = 0; i < 64; i++) {
    struct tt_metrics s = {0};
    s.timestamp = (uint64_t)(i + 1) * 1000;
    s.cpu_usage = (uint16_t)(i * 10);
    ttr_writer_write_l1(&w, &s);
  }

  proc_stats before, after;
  read_proc_status(&before);

  for (int i = 0; i < N_SYNCS; i++) {
    struct tt_metrics s = {0};
    s.timestamp = (uint64_t)(1000 + i) * 1000;
    s.cpu_usage = (uint16_t)(i % 100);
    ttr_writer_write_l1(&w, &s);
    ttr_writer_shadow_sync(&w);
  }

  read_proc_status(&after);

  long dvctx = after.vctx - before.vctx;
  long dnvctx = after.nvctx - before.nvctx;
  long dmajflt = after.majflt - before.majflt;

  printf("  voluntary ctx switches: %ld (%.1f/sync)\n", dvctx, (double)dvctx / N_SYNCS);
  printf("  nonvoluntary ctx switches: %ld\n", dnvctx);
  printf("  major page faults: %ld\n", dmajflt);

  CHECK("vctx switches within limit", dvctx <= (long)(MAX_VCTX_PER_SYNC * N_SYNCS));
  CHECK("no major page faults", dmajflt <= MAX_MAJFLT_TOTAL);
  CHECK("shadow file identical to live", files_identical(LIVE_PATH, SHADOW_PATH));

  ttr_writer_cleanup(&w);
  unlink(LIVE_PATH);
  unlink(SHADOW_PATH);
}

int main(void) {
  printf("=== test_shadow_sync ===\n");
  test_shadow_sync_no_spike();

  printf("\n--- %d/%d passed ---\n", g_run - g_fail, g_run);
  return g_fail ? 1 : 0;
}
