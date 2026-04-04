/*
 * test_seqlock.c - Seqlock correctness: 8 concurrent readers vs 1 writer.
 *
 * Verifies zero torn reads over TEST_DURATION_SEC seconds.
 * Moved from tests/ root and updated to current API (ttr_writer_config,
 * ttr_reader_get_latest with out_size, correct include paths).
 */
#define _GNU_SOURCE
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "common/metrics.h"
#include "common/ringbuf/reader.h"
#include "common/ringbuf/shm.h"
#include "common/ringbuf/writer.h"

#define LIVE_PATH "/tmp/tt-seqlock-live.dat"
#define SHADOW_PATH "/tmp/tt-seqlock-shadow.dat"

#define TEST_DURATION_SEC 10
#define WRITE_INTERVAL_US 1000
#define NUM_READERS 8

static volatile int running = 1;

typedef struct {
  int id;
  uint64_t reads;
  uint64_t inconsistent;
} reader_stats;

static void* writer_thread(void* arg) {
  struct ttr_writer* w = arg;
  struct tt_metrics s = {0};
  uint64_t counter = 0;

  while (running) {
    counter++;
    /* All fields encode the same counter so readers can detect torn reads */
    s.cpu_usage = counter & 0xFFFF;
    s.mem_usage = counter & 0xFFFF;
    s.net_rx = (uint32_t)counter;
    s.net_tx = (uint32_t)counter;
    ttr_writer_write_l1(w, &s);
    usleep(WRITE_INTERVAL_US);
  }

  printf("Writer: wrote %lu samples\n", counter);
  return NULL;
}

static void* reader_thread(void* arg) {
  reader_stats* stats = arg;
  struct ttr_reader r;
  struct tt_metrics s;

  if (ttr_reader_open(&r, LIVE_PATH) != TTR_READER_OK) {
    fprintf(stderr, "Reader %d: open failed\n", stats->id);
    return NULL;
  }

  while (running) {
    if (ttr_reader_get_latest(&r, &s, sizeof(s)) == TTR_READER_OK) {
      stats->reads++;
      if (s.cpu_usage != s.mem_usage || s.net_rx != s.net_tx ||
          (s.net_rx & 0xFFFF) != s.cpu_usage) {
        stats->inconsistent++;
      }
    }
    usleep(100);
  }

  ttr_reader_close(&r);
  return NULL;
}

int main(void) {
  printf("=== test_seqlock ===\n\n");
  printf("Duration: %ds  Readers: %d  Write interval: %dus\n\n", TEST_DURATION_SEC, NUM_READERS,
         WRITE_INTERVAL_US);

  struct ttr_writer_config cfg = {
      .live_path = LIVE_PATH,
      .shadow_path = SHADOW_PATH,
      .l1_capacity = 3600,
      .l2_capacity = 1440,
      .l3_capacity = 672,
      .cell_size = sizeof(struct tt_metrics),
      .file_mode = 0644,
      .enable_crc = false,
      .auto_recover = false,
      .aggregate = tt_metrics_aggregate,
  };

  struct ttr_writer w;
  if (ttr_writer_init(&w, &cfg) != TTR_WRITER_OK) {
    fprintf(stderr, "writer init failed\n");
    return 1;
  }

  pthread_t writer_tid;
  pthread_t reader_tids[NUM_READERS];
  reader_stats stats[NUM_READERS];
  memset(stats, 0, sizeof(stats));

  pthread_create(&writer_tid, NULL, writer_thread, &w);
  for (int i = 0; i < NUM_READERS; i++) {
    stats[i].id = i;
    pthread_create(&reader_tids[i], NULL, reader_thread, &stats[i]);
  }

  sleep(TEST_DURATION_SEC);
  running = 0;

  pthread_join(writer_tid, NULL);
  for (int i = 0; i < NUM_READERS; i++) pthread_join(reader_tids[i], NULL);

  uint64_t total_reads = 0, total_bad = 0;
  for (int i = 0; i < NUM_READERS; i++) {
    total_reads += stats[i].reads;
    total_bad += stats[i].inconsistent;
    printf("  Reader %d: %lu reads, %lu inconsistent (%.4f%%)\n", stats[i].id, stats[i].reads,
           stats[i].inconsistent,
           stats[i].reads ? stats[i].inconsistent * 100.0 / stats[i].reads : 0.0);
  }
  printf("\nTotal: %lu reads, %lu inconsistent (%.4f%%)\n", total_reads, total_bad,
         total_reads ? total_bad * 100.0 / total_reads : 0.0);

  ttr_writer_cleanup(&w);
  unlink(LIVE_PATH);
  unlink(SHADOW_PATH);

  if (total_bad > 0) {
    printf("\n[FAIL] torn reads detected!\n");
    return 1;
  }
  printf("\n[PASS] all reads consistent\n");
  return 0;
}
