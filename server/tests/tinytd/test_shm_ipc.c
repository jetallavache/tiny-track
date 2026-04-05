/*
 * test_shm_ipc.c - Integration test: writer process → shm → reader process.
 *
 * Forks a writer child that writes N samples, then the parent reads them back
 * via ttr_reader, verifying data integrity across process boundary.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

#include "common/metrics.h"
#include "common/ringbuf/reader.h"
#include "common/ringbuf/shm.h"
#include "common/ringbuf/writer.h"

#define LIVE_PATH "/tmp/tt-ipc-live.dat"
#define SHADOW_PATH "/tmp/tt-ipc-shadow.dat"
#define N_SAMPLES 20

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

/* Child: init writer, write N_SAMPLES, exit */
static void writer_child(void) {
  struct ttr_writer_config cfg = {
      .live_path = LIVE_PATH,
      .shadow_path = SHADOW_PATH,
      .l1_capacity = 32,
      .l2_capacity = 8,
      .l3_capacity = 4,
      .cell_size = sizeof(struct tt_metrics),
      .file_mode = 0644,
      .enable_crc = false,
      .auto_recover = false,
      .aggregate = tt_metrics_aggregate,
  };

  struct ttr_writer w;
  if (ttr_writer_init(&w, &cfg) != TTR_WRITER_OK) {
    fprintf(stderr, "child: writer init failed\n");
    exit(2);
  }

  for (int i = 1; i <= N_SAMPLES; i++) {
    struct tt_metrics s = {0};
    s.timestamp = (uint64_t)i * 1000;
    s.cpu_usage = (uint16_t)(i * 10);
    s.mem_usage = (uint16_t)(i * 5);
    s.net_rx = (uint32_t)(i * 100);
    ttr_writer_write_l1(&w, &s);
  }

  ttr_writer_shadow_sync(&w);
  ttr_writer_cleanup(&w);
  exit(0);
}

static void test_cross_process_read(void) {
  printf("\n[cross-process shm IPC]\n");

  unlink(LIVE_PATH);
  unlink(SHADOW_PATH);

  pid_t pid = fork();
  if (pid < 0) {
    perror("fork");
    return;
  }

  if (pid == 0) writer_child(); /* does not return */

  int status;
  waitpid(pid, &status, 0);
  CHECK("writer child exited cleanly", WIFEXITED(status) && WEXITSTATUS(status) == 0);

  /* Parent reads */
  struct ttr_reader r;
  int rc = ttr_reader_open(&r, LIVE_PATH);
  CHECK("reader_open OK", rc == TTR_READER_OK);

  struct tt_metrics out = {0};
  rc = ttr_reader_get_latest(&r, &out, sizeof(out));
  CHECK("get_latest OK", rc == TTR_READER_OK);
  CHECK("latest cpu_usage = N_SAMPLES*10", out.cpu_usage == (uint16_t)(N_SAMPLES * 10));
  CHECK("latest net_rx = N_SAMPLES*100", out.net_rx == (uint32_t)(N_SAMPLES * 100));

  ttr_reader_close(&r);
  unlink(LIVE_PATH);
  unlink(SHADOW_PATH);
}

int main(void) {
  printf("=== test_shm_ipc ===\n");
  test_cross_process_read();

  printf("\n--- %d/%d passed ---\n", g_run - g_fail, g_run);
  return g_fail ? 1 : 0;
}
