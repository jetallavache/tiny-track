#define _GNU_SOURCE
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "common/proto/v1.h"
#include "common/ring/reader.h"
#include "common/ring/shm.h"
#include "common/ring/writer.h"

#define TEST_DURATION_SEC 10
#define WRITE_INTERVAL_US 1000
#define NUM_READERS 8

static volatile int running = 1;
static volatile int errors = 0;

typedef struct {
  int id;
  uint64_t reads;
  uint64_t inconsistent;
} reader_stats;

/* Writer thread: writes monotonically increasing values */
static void *writer_thread(void *arg) {
  struct tt_ring_writer *writer = arg;
  struct tt_proto_metrics sample = {0};
  uint64_t counter = 0;

  while (running) {
    counter++;
    sample.cpu_usage = counter & 0xFFFF;
    sample.mem_usage = counter & 0xFFFF;
    sample.net_rx = counter;
    sample.net_tx = counter;

    tt_ring_writer_write_l1(writer, &sample);
    usleep(WRITE_INTERVAL_US);
  }

  printf("Writer: wrote %lu samples\n", counter);
  return NULL;
}

/* Reader thread: checks data consistency */
static void *reader_thread(void *arg) {
  reader_stats *stats = arg;
  struct tt_ring_reader reader;
  struct tt_proto_metrics sample;

  if (tt_ring_reader_open(&reader, "/tmp/tinytd-test-live") != TT_READER_OK) {
    fprintf(stderr, "Reader %d: failed to open\n", stats->id);
    return NULL;
  }

  while (running) {
    if (tt_ring_reader_get_latest(&reader, &sample) == TT_READER_OK) {
      stats->reads++;

      /* Consistency check: all fields must come from the same sample */
      if (sample.cpu_usage != sample.mem_usage ||
          sample.net_rx != sample.net_tx ||
          (sample.net_rx & 0xFFFF) != sample.cpu_usage) {
        stats->inconsistent++;
        __sync_fetch_and_add(&errors, 1);
      }
    }
    usleep(100);
  }

  tt_ring_reader_close(&reader);
  return NULL;
}

int main(void) {
  printf("TinyTrack Seqlock Correctness Test\n");
  printf("===================================\n\n");
  printf("Duration: %d seconds\n", TEST_DURATION_SEC);
  printf("Readers: %d\n", NUM_READERS);
  printf("Write interval: %d us\n\n", WRITE_INTERVAL_US);

  struct tt_ring_writer writer;
  int ret = tt_ring_writer_init(&writer, "/tmp/tinytd-test-live", "/tmp/tinytd-test-shadow",
                          3600, 1440, 672, 0644);
  if (ret != TT_WRITER_OK) {
    fprintf(stderr, "Failed to init writer: %d\n", ret);
    return 1;
  }

  pthread_t writer_tid;
  pthread_t reader_tids[NUM_READERS];
  reader_stats stats[NUM_READERS] = {0};

  /* Start writer */
  pthread_create(&writer_tid, NULL, writer_thread, &writer);

  /* Start readers */
  for (int i = 0; i < NUM_READERS; i++) {
    stats[i].id = i;
    pthread_create(&reader_tids[i], NULL, reader_thread, &stats[i]);
  }

  /* Wait */
  sleep(TEST_DURATION_SEC);
  running = 0;

  /* Shutdown */
  pthread_join(writer_tid, NULL);
  for (int i = 0; i < NUM_READERS; i++) {
    pthread_join(reader_tids[i], NULL);
  }

  /* Results */
  printf("Results:\n");
  printf("--------\n");

  uint64_t total_reads = 0;
  uint64_t total_inconsistent = 0;

  for (int i = 0; i < NUM_READERS; i++) {
    total_reads += stats[i].reads;
    total_inconsistent += stats[i].inconsistent;
    printf("Reader %d: %lu reads, %lu inconsistent (%.4f%%)\n", stats[i].id,
           stats[i].reads, stats[i].inconsistent,
           (stats[i].inconsistent * 100.0) / stats[i].reads);
  }

  printf("\nTotal: %lu reads, %lu inconsistent (%.4f%%)\n", total_reads,
         total_inconsistent, (total_inconsistent * 100.0) / total_reads);

  /* Cleanup */
  tt_ring_writer_cleanup(&writer);
  tt_shm_unlink("/tmp/tinytd-test-live");
  tt_shm_unlink("/tmp/tinytd-test-shadow");

  if (total_inconsistent > 0) {
    printf("\n❌ TEST FAILED: Found inconsistent reads!\n");
    return 1;
  }

  printf("\n✅ TEST PASSED: All reads consistent!\n");
  return 0;
}
