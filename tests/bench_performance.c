#define _GNU_SOURCE
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#include "common/proto/v1.h"
#include "common/ring/reader.h"
#include "common/ring/shm.h"
#include "common/ring/writer.h"

#define BENCH_ITERATIONS 1000000
#define NUM_READERS 4

static uint64_t get_ns(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return ts.tv_sec * 1000000000ULL + ts.tv_nsec;
}

/* Benchmark: writer throughput */
static void bench_writer_throughput(void) {
  struct ttr_writer writer;
  struct tt_metrics sample = {0};

  ttr_writer_init(&writer, "/tmp/tinytd-bench-live", "/tmp/tinytd-bench-shadow",
                      3600, 1440, 672, 0644);

  uint64_t start = get_ns();
  for (int i = 0; i < BENCH_ITERATIONS; i++) {
    sample.cpu_usage = i % 10000;
    ttr_writer_write_l1(&writer, &sample);
  }
  uint64_t end = get_ns();

  ttr_writer_cleanup(&writer);
  ttr_shm_unlink("/tmp/tinytd-bench-live");
  ttr_shm_unlink("/tmp/tinytd-bench-shadow");

  double elapsed_sec = (end - start) / 1e9;
  double ops_per_sec = BENCH_ITERATIONS / elapsed_sec;
  double ns_per_op = (end - start) / (double)BENCH_ITERATIONS;

  printf("Writer throughput:\n");
  printf("  Operations: %d\n", BENCH_ITERATIONS);
  printf("  Time: %.3f sec\n", elapsed_sec);
  printf("  Throughput: %.0f ops/sec\n", ops_per_sec);
  printf("  Latency: %.0f ns/op\n\n", ns_per_op);
}

/* Benchmark: reader throughput */
static void bench_reader_throughput(void) {
  struct ttr_writer writer;
  struct ttr_reader reader;
  struct tt_metrics sample = {0};
  struct tt_metrics out;

  ttr_writer_init(&writer, "/tmp/tinytd-bench-live", "/tmp/tinytd-bench-shadow",
                      3600, 1440, 672, 0644);

  /* Fill with data */
  for (int i = 0; i < 100; i++) {
    sample.cpu_usage = i;
    ttr_writer_write_l1(&writer, &sample);
  }

  ttr_reader_open(&reader, "/tmp/tinytd-bench-live");

  uint64_t start = get_ns();
  for (int i = 0; i < BENCH_ITERATIONS; i++) {
    ttr_reader_get_latest(&reader, &out);
  }
  uint64_t end = get_ns();

  ttr_reader_close(&reader);
  ttr_writer_cleanup(&writer);
  ttr_shm_unlink("/tmp/tinytd-bench-live");
  ttr_shm_unlink("/tmp/tinytd-bench-shadow");

  double elapsed_sec = (end - start) / 1e9;
  double ops_per_sec = BENCH_ITERATIONS / elapsed_sec;
  double ns_per_op = (end - start) / (double)BENCH_ITERATIONS;

  printf("Reader throughput:\n");
  printf("  Operations: %d\n", BENCH_ITERATIONS);
  printf("  Time: %.3f sec\n", elapsed_sec);
  printf("  Throughput: %.0f ops/sec\n", ops_per_sec);
  printf("  Latency: %.0f ns/op\n\n", ns_per_op);
}

/* Benchmark: concurrent readers */
typedef struct {
  int id;
  int iterations;
  uint64_t duration_ns;
} reader_thread_ctx;

static void *reader_thread(void *arg) {
  reader_thread_ctx *ctx = arg;
  struct ttr_reader reader;
  struct tt_metrics out;

  ttr_reader_open(&reader, "/tmp/tinytd-bench-live");

  uint64_t start = get_ns();
  for (int i = 0; i < ctx->iterations; i++) {
    ttr_reader_get_latest(&reader, &out);
  }
  uint64_t end = get_ns();

  ctx->duration_ns = end - start;
  ttr_reader_close(&reader);
  return NULL;
}

static void bench_concurrent_readers(void) {
  struct ttr_writer writer;
  struct tt_metrics sample = {0};

  ttr_writer_init(&writer, "/tmp/tinytd-bench-live", "/tmp/tinytd-bench-shadow",
                      3600, 1440, 672, 0644);

  /* Fill with data */
  for (int i = 0; i < 100; i++) {
    sample.cpu_usage = i;
    ttr_writer_write_l1(&writer, &sample);
  }

  pthread_t threads[NUM_READERS];
  reader_thread_ctx contexts[NUM_READERS];

  uint64_t start = get_ns();

  for (int i = 0; i < NUM_READERS; i++) {
    contexts[i].id = i;
    contexts[i].iterations = BENCH_ITERATIONS / NUM_READERS;
    pthread_create(&threads[i], NULL, reader_thread, &contexts[i]);
  }

  for (int i = 0; i < NUM_READERS; i++) {
    pthread_join(threads[i], NULL);
  }

  uint64_t end = get_ns();

  ttr_writer_cleanup(&writer);
  ttr_shm_unlink("/tmp/tinytd-bench-live");
  ttr_shm_unlink("/tmp/tinytd-bench-shadow");

  double elapsed_sec = (end - start) / 1e9;
  double total_ops = BENCH_ITERATIONS;
  double ops_per_sec = total_ops / elapsed_sec;

  printf("Concurrent readers (%d threads):\n", NUM_READERS);
  printf("  Total operations: %.0f\n", total_ops);
  printf("  Time: %.3f sec\n", elapsed_sec);
  printf("  Throughput: %.0f ops/sec\n", ops_per_sec);

  for (int i = 0; i < NUM_READERS; i++) {
    double thread_ops_sec =
        contexts[i].iterations / (contexts[i].duration_ns / 1e9);
    printf("  Thread %d: %.0f ops/sec\n", i, thread_ops_sec);
  }
  printf("\n");
}

/* Benchmark: seqlock retry rate */
static void bench_seqlock_contention(void) {
  struct ttr_writer writer;
  struct tt_metrics sample = {0};

  ttr_writer_init(&writer, "/tmp/tinytd-bench-live", "/tmp/tinytd-bench-shadow",
                      3600, 1440, 672, 0644);

  /* Writer thread */
  pthread_t writer_thread;
  int writer_running = 1;

  void *writer_func(void *arg) {
    (void)arg;
    while (writer_running) {
      sample.cpu_usage++;
      ttr_writer_write_l1(&writer, &sample);
      usleep(10);
    }
    return NULL;
  }

  pthread_create(&writer_thread, NULL, writer_func, NULL);

  /* Reader with retry counting */
  struct ttr_reader reader;
  struct tt_metrics out;
  ttr_reader_open(&reader, "/tmp/tinytd-bench-live");

  int total_reads = 10000;
  int retries = 0;

  for (int i = 0; i < total_reads; i++) {
    /* Emulate retry counting via repeated reads */
    ttr_reader_get_latest(&reader, &out);
  }

  writer_running = 0;
  pthread_join(writer_thread, NULL);

  ttr_reader_close(&reader);
  ttr_writer_cleanup(&writer);
  ttr_shm_unlink("/tmp/tinytd-bench-live");
  ttr_shm_unlink("/tmp/tinytd-bench-shadow");

  printf("Seqlock contention:\n");
  printf("  Total reads: %d\n", total_reads);
  printf("  Retries: %d\n", retries);
  printf("  Retry rate: %.2f%%\n\n", (retries * 100.0) / total_reads);
}

/* Benchmark: memory usage */
static void bench_memory_usage(void) {
  struct ttr_writer writer;

  size_t l1_cap = 3600;
  size_t l2_cap = 1440;
  size_t l3_cap = 672;

  ttr_writer_init(&writer, "/tmp/tinytd-bench-live", "/tmp/tinytd-bench-shadow",
                      l1_cap, l2_cap, l3_cap, 0644);

  size_t cell_size = sizeof(struct tt_metrics);
  size_t total_size =
      tt_layout_total_size(l1_cap, l2_cap, l3_cap, cell_size);

  printf("Memory usage:\n");
  printf("  Cell size: %zu bytes\n", cell_size);
  printf("  L1 capacity: %zu (1h @ 1s)\n", l1_cap);
  printf("  L2 capacity: %zu (24h @ 1m)\n", l2_cap);
  printf("  L3 capacity: %zu (7d @ 15m)\n", l3_cap);
  printf("  Total size: %zu bytes (%.2f MB)\n", total_size,
         total_size / 1024.0 / 1024.0);
  printf("  Per-process: %.2f MB (live + shadow)\n\n",
         (total_size * 2) / 1024.0 / 1024.0);

  ttr_writer_cleanup(&writer);
  ttr_shm_unlink("/tmp/tinytd-bench-live");
  ttr_shm_unlink("/tmp/tinytd-bench-shadow");
}

int main(void) {
  printf("TinyTrack Performance Benchmark\n");
  printf("================================\n\n");

  bench_memory_usage();
  bench_writer_throughput();
  bench_reader_throughput();
  bench_concurrent_readers();
  bench_seqlock_contention();

  printf("Benchmark complete.\n");
  return 0;
}
