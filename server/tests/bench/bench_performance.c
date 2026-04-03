/*
 * bench_performance.c - Writer/reader throughput, concurrent readers,
 *                       seqlock contention, memory layout size.
 *
 * Updated to current API: ttr_writer_config struct, ttr_reader_get_latest
 * with out_size, correct include paths (common/ringbuf/ not common/ring/).
 */
#define _GNU_SOURCE
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#include "common/metrics.h"
#include "common/ringbuf/layout.h"
#include "common/ringbuf/reader.h"
#include "common/ringbuf/shm.h"
#include "common/ringbuf/writer.h"

#define BENCH_ITERATIONS 1000000
#define NUM_READERS      4

#define LIVE_PATH   "/tmp/tt-bench-live.dat"
#define SHADOW_PATH "/tmp/tt-bench-shadow.dat"

static uint64_t get_ns(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000000000ULL + (uint64_t)ts.tv_nsec;
}

static struct ttr_writer_config make_cfg(void) {
    struct ttr_writer_config cfg = {
        .live_path    = LIVE_PATH,
        .shadow_path  = SHADOW_PATH,
        .l1_capacity  = 3600,
        .l2_capacity  = 1440,
        .l3_capacity  = 672,
        .cell_size    = sizeof(struct tt_metrics),
        .file_mode    = 0644,
        .enable_crc   = false,
        .auto_recover = false,
        .aggregate    = tt_metrics_aggregate,
    };
    return cfg;
}

/* --- writer throughput -------------------------------------------------- */
static void bench_writer_throughput(void) {
    struct ttr_writer_config cfg = make_cfg();
    struct ttr_writer w;
    ttr_writer_init(&w, &cfg);

    struct tt_metrics s = {0};
    uint64_t t0 = get_ns();
    for (int i = 0; i < BENCH_ITERATIONS; i++) {
        s.cpu_usage = (uint16_t)(i % 10000);
        ttr_writer_write_l1(&w, &s);
    }
    uint64_t t1 = get_ns();

    ttr_writer_cleanup(&w);
    ttr_shm_unlink(LIVE_PATH);
    ttr_shm_unlink(SHADOW_PATH);

    double sec = (t1 - t0) / 1e9;
    printf("Writer throughput:\n");
    printf("  %.0f ops/sec  (%.0f ns/op)\n\n",
           BENCH_ITERATIONS / sec, (t1 - t0) / (double)BENCH_ITERATIONS);
}

/* --- reader throughput -------------------------------------------------- */
static void bench_reader_throughput(void) {
    struct ttr_writer_config cfg = make_cfg();
    struct ttr_writer w;
    ttr_writer_init(&w, &cfg);

    struct tt_metrics s = {0};
    for (int i = 0; i < 100; i++) { s.cpu_usage = (uint16_t)i; ttr_writer_write_l1(&w, &s); }

    struct ttr_reader r;
    ttr_reader_open(&r, LIVE_PATH);

    struct tt_metrics out;
    uint64_t t0 = get_ns();
    for (int i = 0; i < BENCH_ITERATIONS; i++)
        ttr_reader_get_latest(&r, &out, sizeof(out));
    uint64_t t1 = get_ns();

    ttr_reader_close(&r);
    ttr_writer_cleanup(&w);
    ttr_shm_unlink(LIVE_PATH);
    ttr_shm_unlink(SHADOW_PATH);

    double sec = (t1 - t0) / 1e9;
    printf("Reader throughput:\n");
    printf("  %.0f ops/sec  (%.0f ns/op)\n\n",
           BENCH_ITERATIONS / sec, (t1 - t0) / (double)BENCH_ITERATIONS);
}

/* --- concurrent readers ------------------------------------------------- */
typedef struct { int id; int iters; uint64_t dur_ns; } rctx;

static void *reader_fn(void *arg) {
    rctx *ctx = arg;
    struct ttr_reader r;
    struct tt_metrics out;
    ttr_reader_open(&r, LIVE_PATH);
    uint64_t t0 = get_ns();
    for (int i = 0; i < ctx->iters; i++)
        ttr_reader_get_latest(&r, &out, sizeof(out));
    ctx->dur_ns = get_ns() - t0;
    ttr_reader_close(&r);
    return NULL;
}

static void bench_concurrent_readers(void) {
    struct ttr_writer_config cfg = make_cfg();
    struct ttr_writer w;
    ttr_writer_init(&w, &cfg);

    struct tt_metrics s = {0};
    for (int i = 0; i < 100; i++) { s.cpu_usage = (uint16_t)i; ttr_writer_write_l1(&w, &s); }

    pthread_t tids[NUM_READERS];
    rctx ctxs[NUM_READERS];
    uint64_t t0 = get_ns();
    for (int i = 0; i < NUM_READERS; i++) {
        ctxs[i] = (rctx){ .id = i, .iters = BENCH_ITERATIONS / NUM_READERS };
        pthread_create(&tids[i], NULL, reader_fn, &ctxs[i]);
    }
    for (int i = 0; i < NUM_READERS; i++) pthread_join(tids[i], NULL);
    uint64_t t1 = get_ns();

    ttr_writer_cleanup(&w);
    ttr_shm_unlink(LIVE_PATH);
    ttr_shm_unlink(SHADOW_PATH);

    double sec = (t1 - t0) / 1e9;
    printf("Concurrent readers (%d threads):\n", NUM_READERS);
    printf("  %.0f ops/sec total\n", BENCH_ITERATIONS / sec);
    for (int i = 0; i < NUM_READERS; i++)
        printf("  Thread %d: %.0f ops/sec\n", i,
               ctxs[i].iters / (ctxs[i].dur_ns / 1e9));
    printf("\n");
}

/* --- memory layout size ------------------------------------------------- */
static void bench_memory_usage(void) {
    size_t l1 = 3600, l2 = 1440, l3 = 672;
    size_t cell = sizeof(struct tt_metrics);
    size_t total = tt_layout_total_size(l1, l2, l3, cell);

    printf("Memory layout:\n");
    printf("  Cell: %zu bytes\n", cell);
    printf("  L1=%zu  L2=%zu  L3=%zu\n", l1, l2, l3);
    printf("  Total: %zu bytes (%.2f MB)  live+shadow: %.2f MB\n\n",
           total, total / 1024.0 / 1024.0, total * 2 / 1024.0 / 1024.0);
}

int main(void) {
    printf("TinyTrack Performance Benchmark\n");
    printf("================================\n\n");
    bench_memory_usage();
    bench_writer_throughput();
    bench_reader_throughput();
    bench_concurrent_readers();
    printf("Done.\n");
    return 0;
}
