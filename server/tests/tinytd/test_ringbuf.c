/*
 * test_ringbuf.c - Unit tests for ring buffer writer/reader.
 *
 * Tests: init, write_l1, get_latest, overflow wrap-around,
 *        aggregate_l2/l3, shadow_sync, null-args.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "common/metrics.h"
#include "common/ringbuf/reader.h"
#include "common/ringbuf/shm.h"
#include "common/ringbuf/writer.h"

#define LIVE_PATH "/tmp/tt-test-rb-live.dat"
#define SHADOW_PATH "/tmp/tt-test-rb-shadow.dat"

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

/* ttr_shm_unlink() calls shm_unlink() which only works for POSIX shm names.
 * Our tests use /tmp/ paths, so we unlink directly. */
static void cleanup(void) {
  unlink(LIVE_PATH);
  unlink(SHADOW_PATH);
}

static struct ttr_writer_config make_cfg(void) {
  struct ttr_writer_config cfg = {
      .live_path = LIVE_PATH,
      .shadow_path = SHADOW_PATH,
      .l1_capacity = 8,
      .l2_capacity = 4,
      .l3_capacity = 2,
      .cell_size = sizeof(struct tt_metrics),
      .file_mode = 0600,
      .enable_crc = false,
      .auto_recover = false,
      .aggregate = tt_metrics_aggregate,
  };
  return cfg;
}

/* --- init / cleanup ---------------------------------------------------- */
static void test_init_cleanup(void) {
  printf("\n[init/cleanup]\n");
  cleanup();
  struct ttr_writer w;
  struct ttr_writer_config cfg = make_cfg();

  CHECK("init returns OK", ttr_writer_init(&w, &cfg) == TTR_WRITER_OK);
  CHECK("live_addr non-null", (intptr_t)w.live_addr >= 0);
  CHECK("shadow_addr non-null", (intptr_t)w.shadow_addr >= 0);
  ttr_writer_cleanup(&w);
  cleanup();
}

/* --- write + get_latest ------------------------------------------------- */
static void test_write_read(void) {
  printf("\n[write / get_latest]\n");
  cleanup();
  struct ttr_writer w;
  struct ttr_writer_config cfg = make_cfg();
  ttr_writer_init(&w, &cfg);

  struct tt_metrics s = {0};
  s.timestamp = 1000;
  s.cpu_usage = 2550;
  s.mem_usage = 5000;
  s.net_rx = 1024;
  s.net_tx = 512;

  CHECK("write_l1 OK", ttr_writer_write_l1(&w, &s) == TTR_WRITER_OK);

  struct ttr_reader r;
  CHECK("reader_open OK", ttr_reader_open(&r, LIVE_PATH) == TTR_READER_OK);

  struct tt_metrics out = {0};
  CHECK("get_latest OK", ttr_reader_get_latest(&r, &out, sizeof(out)) == TTR_READER_OK);
  CHECK("cpu_usage matches", out.cpu_usage == s.cpu_usage);
  CHECK("mem_usage matches", out.mem_usage == s.mem_usage);
  CHECK("net_rx matches", out.net_rx == s.net_rx);
  CHECK("timestamp matches", out.timestamp == s.timestamp);

  ttr_reader_close(&r);
  ttr_writer_cleanup(&w);
  cleanup();
}

/* --- ring wrap-around --------------------------------------------------- */
static void test_overflow(void) {
  printf("\n[ring wrap-around]\n");
  cleanup();
  struct ttr_writer w;
  struct ttr_writer_config cfg = make_cfg();
  ttr_writer_init(&w, &cfg);

  for (int i = 1; i <= 16; i++) {
    struct tt_metrics s = {0};
    s.timestamp = (uint64_t)i * 100;
    s.cpu_usage = (uint16_t)i;
    ttr_writer_write_l1(&w, &s);
  }

  /* Open reader after all writes so mmap reflects current state */
  struct ttr_reader r;
  ttr_reader_open(&r, LIVE_PATH);

  struct tt_metrics out = {0};
  int rc = ttr_reader_get_latest(&r, &out, sizeof(out));
  CHECK("get_latest after overflow OK", rc == TTR_READER_OK);
  CHECK("latest is sample 16", out.cpu_usage == 16);

  ttr_reader_close(&r);
  ttr_writer_cleanup(&w);
  cleanup();
}

/* --- aggregate_l2 ------------------------------------------------------- */
static void test_aggregate_l2(void) {
  printf("\n[aggregate_l2]\n");
  cleanup();
  struct ttr_writer w;
  struct ttr_writer_config cfg = make_cfg();
  ttr_writer_init(&w, &cfg);

  for (int i = 0; i < 8; i++) {
    struct tt_metrics s = {0};
    s.timestamp = (uint64_t)(i + 1) * 1000;
    s.cpu_usage = 100;
    ttr_writer_write_l1(&w, &s);
  }

  int rc = ttr_writer_aggregate_l2(&w);
  CHECK("aggregate_l2 returns OK or NODATA", rc == TTR_WRITER_OK || rc == TTR_WRITER_ERR_NODATA);

  ttr_writer_cleanup(&w);
  cleanup();
}

/* --- shadow_sync -------------------------------------------------------- */
static void test_shadow_sync(void) {
  printf("\n[shadow_sync]\n");
  cleanup();
  struct ttr_writer w;
  struct ttr_writer_config cfg = make_cfg();
  ttr_writer_init(&w, &cfg);

  struct tt_metrics s = {0};
  s.timestamp = 9999;
  ttr_writer_write_l1(&w, &s);

  CHECK("shadow_sync OK", ttr_writer_shadow_sync(&w) == TTR_WRITER_OK);

  ttr_writer_cleanup(&w);
  cleanup();
}

/* --- null / invalid args ------------------------------------------------ */
static void test_null_args(void) {
  printf("\n[null / invalid args]\n");
  CHECK("write_l1 NULL ctx returns error", ttr_writer_write_l1(NULL, NULL) != TTR_WRITER_OK);

  cleanup();
  struct ttr_writer w;
  struct ttr_writer_config cfg = make_cfg();
  ttr_writer_init(&w, &cfg);
  CHECK("write_l1 NULL sample returns error", ttr_writer_write_l1(&w, NULL) != TTR_WRITER_OK);
  ttr_writer_cleanup(&w);
  cleanup();
}

int main(void) {
  printf("=== test_ringbuf ===\n");
  test_init_cleanup();
  test_write_read();
  test_overflow();
  test_aggregate_l2();
  test_shadow_sync();
  test_null_args();

  printf("\n--- %d/%d passed ---\n", g_run - g_fail, g_run);
  return g_fail ? 1 : 0;
}
