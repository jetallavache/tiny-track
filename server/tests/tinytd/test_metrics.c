/*
 * test_metrics.c - Unit tests for tt_metrics_aggregate.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <string.h>

#include "common/metrics.h"

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

static void test_aggregate_average(void) {
  printf("\n[aggregate: average]\n");

  struct tt_metrics samples[4] = {0};
  for (int i = 0; i < 4; i++) {
    samples[i].timestamp = (uint64_t)(i + 1) * 1000;
    samples[i].cpu_usage = 100 * (i + 1); /* 100, 200, 300, 400 → avg 250 */
    samples[i].mem_usage = 500;
    samples[i].net_rx = 1000;
    samples[i].net_tx = 2000;
  }

  struct tt_metrics out = {0};
  tt_metrics_aggregate(samples, 4, sizeof(struct tt_metrics), &out);

  CHECK("cpu_usage avg = 250", out.cpu_usage == 250);
  CHECK("mem_usage avg = 500", out.mem_usage == 500);
  CHECK("net_rx avg = 1000", out.net_rx == 1000);
  CHECK("net_tx avg = 2000", out.net_tx == 2000);
  /* timestamp should be last sample's */
  CHECK("timestamp = last", out.timestamp == 4000);
}

static void test_aggregate_single(void) {
  printf("\n[aggregate: single sample]\n");

  struct tt_metrics s = {0};
  s.timestamp = 7777;
  s.cpu_usage = 1234;
  s.load_1min = 99;

  struct tt_metrics out = {0};
  tt_metrics_aggregate(&s, 1, sizeof(struct tt_metrics), &out);

  CHECK("single: cpu_usage passthrough", out.cpu_usage == 1234);
  CHECK("single: load_1min passthrough", out.load_1min == 99);
  CHECK("single: timestamp passthrough", out.timestamp == 7777);
}

static void test_aggregate_zeros(void) {
  printf("\n[aggregate: all zeros]\n");

  struct tt_metrics samples[3] = {0};
  struct tt_metrics out;
  memset(&out, 0xFF, sizeof(out));

  tt_metrics_aggregate(samples, 3, sizeof(struct tt_metrics), &out);

  CHECK("zeros: cpu_usage = 0", out.cpu_usage == 0);
  CHECK("zeros: net_rx = 0", out.net_rx == 0);
}

int main(void) {
  printf("=== test_metrics ===\n");
  test_aggregate_average();
  test_aggregate_single();
  test_aggregate_zeros();

  printf("\n--- %d/%d passed ---\n", g_run - g_fail, g_run);
  return g_fail ? 1 : 0;
}
