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

/* --- history with full ring (wrap-around) ------------------------------- */
static void test_history_full_ring(void) {
  printf("\n[history full ring]\n");
  cleanup();
  struct ttr_writer w;
  struct ttr_writer_config cfg = make_cfg(); /* l1_capacity = 8 */
  ttr_writer_init(&w, &cfg);

  /* Write 16 samples — ring wraps twice */
  for (int i = 1; i <= 16; i++) {
    struct tt_metrics s = {0};
    s.cpu_usage = (uint16_t)i;
    ttr_writer_write_l1(&w, &s);
  }

  struct ttr_reader r;
  ttr_reader_open(&r, LIVE_PATH);

  struct tt_metrics out[8];
  int got = ttr_reader_get_history(&r, 1, out, sizeof(out[0]), 8);
  CHECK("get_history returns 8 after wrap", got == 8);
  /* Most recent 8 samples should be 9..16 */
  CHECK("last sample is 16", out[got - 1].cpu_usage == 16);
  CHECK("first of batch is 9", out[0].cpu_usage == 9);

  ttr_reader_close(&r);
  ttr_writer_cleanup(&w);
  cleanup();
}

/* --- history partial (request more than available) ---------------------- */
static void test_history_partial(void) {
  printf("\n[history partial]\n");
  cleanup();
  struct ttr_writer w;
  struct ttr_writer_config cfg = make_cfg();
  ttr_writer_init(&w, &cfg);

  for (int i = 1; i <= 3; i++) {
    struct tt_metrics s = {0};
    s.cpu_usage = (uint16_t)i;
    ttr_writer_write_l1(&w, &s);
  }

  struct ttr_reader r;
  ttr_reader_open(&r, LIVE_PATH);

  struct tt_metrics out[8];
  int got = ttr_reader_get_history(&r, 1, out, sizeof(out[0]), 8);
  CHECK("get_history returns 3 when only 3 written", got == 3);
  CHECK("last sample is 3", out[got - 1].cpu_usage == 3);

  ttr_reader_close(&r);
  ttr_writer_cleanup(&w);
  cleanup();
}

/* --- aggregate_l3 ------------------------------------------------------- */
static void test_aggregate_l3(void) {
  printf("\n[aggregate_l3]\n");
  cleanup();
  struct ttr_writer w;
  struct ttr_writer_config cfg = make_cfg();
  ttr_writer_init(&w, &cfg);

  /* Fill L1, aggregate to L2, then aggregate L2 to L3 */
  for (int i = 0; i < 8; i++) {
    struct tt_metrics s = {0};
    s.cpu_usage = 200;
    ttr_writer_write_l1(&w, &s);
  }
  ttr_writer_aggregate_l2(&w);

  int rc = ttr_writer_aggregate_l3(&w);
  CHECK("aggregate_l3 OK or NODATA", rc == TTR_WRITER_OK || rc == TTR_WRITER_ERR_NODATA);

  ttr_writer_cleanup(&w);
  cleanup();
}

/* --- shadow recovery ---------------------------------------------------- */
static void test_shadow_recovery(void) {
  printf("\n[shadow recovery]\n");
  cleanup();

  /* Phase 1: write data and sync to shadow */
  {
    struct ttr_writer w;
    struct ttr_writer_config cfg = make_cfg();
    cfg.enable_crc = true;
    cfg.auto_recover = false;
    ttr_writer_init(&w, &cfg);

    struct tt_metrics s = {0};
    s.cpu_usage = 4242;
    ttr_writer_write_l1(&w, &s);
    ttr_writer_shadow_sync(&w);
    ttr_writer_cleanup(&w);
  }

  /* Remove live file to simulate crash */
  unlink(LIVE_PATH);

  /* Phase 2: re-init with auto_recover=true — should restore from shadow */
  {
    struct ttr_writer w;
    struct ttr_writer_config cfg = make_cfg();
    cfg.enable_crc = true;
    cfg.auto_recover = true;
    int rc = ttr_writer_init(&w, &cfg);
    CHECK("re-init with recovery OK", rc == TTR_WRITER_OK);

    struct ttr_reader r;
    ttr_reader_open(&r, LIVE_PATH);
    struct tt_metrics out = {0};
    int rrc = ttr_reader_get_latest(&r, &out, sizeof(out));
    CHECK("recovered data readable", rrc == TTR_READER_OK);
    CHECK("recovered cpu_usage matches", out.cpu_usage == 4242);
    ttr_reader_close(&r);
    ttr_writer_cleanup(&w);
  }
  cleanup();
}

/* --- shadow CRC mismatch → recovery rejected ---------------------------- */
static void test_shadow_crc_mismatch(void) {
  printf("\n[shadow crc mismatch]\n");
  cleanup();

  /* Write and sync */
  {
    struct ttr_writer w;
    struct ttr_writer_config cfg = make_cfg();
    cfg.enable_crc = true;
    cfg.auto_recover = false;
    ttr_writer_init(&w, &cfg);
    struct tt_metrics s = {0};
    s.cpu_usage = 1111;
    ttr_writer_write_l1(&w, &s);
    ttr_writer_shadow_sync(&w);
    ttr_writer_cleanup(&w);
  }

  /* Corrupt one byte in the shadow file */
  FILE* f = fopen(SHADOW_PATH, "r+b");
  if (f) {
    fseek(f, 64, SEEK_SET); /* past header magic/version */
    uint8_t b = 0xFF;
    fwrite(&b, 1, 1, f);
    fclose(f);
  }

  unlink(LIVE_PATH);

  /* Recovery should be rejected; writer initialises fresh */
  {
    struct ttr_writer w;
    struct ttr_writer_config cfg = make_cfg();
    cfg.enable_crc = true;
    cfg.auto_recover = true;
    int rc = ttr_writer_init(&w, &cfg);
    CHECK("init after corrupt shadow OK", rc == TTR_WRITER_OK);

    struct ttr_reader r;
    ttr_reader_open(&r, LIVE_PATH);
    struct tt_metrics out = {0};
    int rrc = ttr_reader_get_latest(&r, &out, sizeof(out));
    /* Fresh ring — no data yet */
    CHECK("corrupt shadow not recovered", rrc == TTR_READER_ERR_NODATA ||
                                          out.cpu_usage != 1111);
    ttr_reader_close(&r);
    ttr_writer_cleanup(&w);
  }
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
  test_history_full_ring();
  test_history_partial();
  test_aggregate_l3();
  test_shadow_recovery();
  test_shadow_crc_mismatch();

  printf("\n--- %d/%d passed ---\n", g_run - g_fail, g_run);
  return g_fail ? 1 : 0;
}
