/*
 * test_cli_config.c — Unit tests for CLI config loader (ttc_config_load).
 *
 * Creates a temporary INI file and verifies that all keys are parsed
 * correctly. No running daemon required.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "cli/src/config.h"

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

/* ------------------------------------------------------------------ */

static const char* CONF_CONTENT =
    "[storage]\n"
    "live_path = /tmp/tt-cli-test-live.dat\n"
    "\n"
    "[tinytd]\n"
    "pid_file = /tmp/tt-cli-test-tinytd.pid\n"
    "\n"
    "[gateway]\n"
    "pid_file = /tmp/tt-cli-test-gw.pid\n"
    "listen   = ws://127.0.0.1:14028\n"
    "\n"
    "[collection]\n"
    "interval_ms = 500\n"
    "\n"
    "[ringbuffer]\n"
    "l1_capacity = 3600\n"
    "l2_capacity = 1440\n"
    "l3_capacity = 672\n"
    "l2_aggregate_interval = 60\n"
    "l3_aggregate_interval = 3600\n";

static char g_tmp_conf[256];

static void write_tmp_conf(void) {
  snprintf(g_tmp_conf, sizeof(g_tmp_conf), "/tmp/tt-cli-test-conf-%d.ini", (int)getpid());
  FILE* f = fopen(g_tmp_conf, "w");
  if (!f) {
    perror("fopen");
    exit(1);
  }
  fputs(CONF_CONTENT, f);
  fclose(f);
}

static void test_config_load(void) {
  struct ttc_config cfg;
  memset(&cfg, 0, sizeof(cfg));

  ttc_config_load(&cfg, g_tmp_conf, NULL, NULL);

  CHECK("shm_path parsed", strcmp(cfg.shm_path, "/tmp/tt-cli-test-live.dat") == 0);
  CHECK("pid_file parsed", strcmp(cfg.pid_file, "/tmp/tt-cli-test-tinytd.pid") == 0);
  CHECK("gw_pid_file parsed", strcmp(cfg.gw_pid_file, "/tmp/tt-cli-test-gw.pid") == 0);
  CHECK("gw_listen parsed", strcmp(cfg.gw_listen, "ws://127.0.0.1:14028") == 0);
  CHECK("interval_ms parsed", cfg.interval_ms == 500);
  CHECK("l1_capacity parsed", cfg.l1_capacity == 3600);
  CHECK("l2_capacity parsed", cfg.l2_capacity == 1440);
  CHECK("l3_capacity parsed", cfg.l3_capacity == 672);
  CHECK("l2_agg_interval_sec", cfg.l2_agg_interval_sec == 60);
  CHECK("l3_agg_interval_sec", cfg.l3_agg_interval_sec == 3600);
}

static void test_config_override(void) {
  struct ttc_config cfg;
  memset(&cfg, 0, sizeof(cfg));

  ttc_config_load(&cfg, g_tmp_conf, "/override/live.dat", /* shm_override */
                  "/override/tinytd.pid" /* pid_override */);

  CHECK("shm_path overridden", strcmp(cfg.shm_path, "/override/live.dat") == 0);
  CHECK("pid_file overridden", strcmp(cfg.pid_file, "/override/tinytd.pid") == 0);
  /* Other keys still from file */
  CHECK("interval_ms still from file", cfg.interval_ms == 500);
}

static void test_config_missing_file(void) {
  struct ttc_config cfg;
  memset(&cfg, 0, sizeof(cfg));

  /* Should not crash; fields get defaults (possibly from system config) */
  ttc_config_load(&cfg, "/nonexistent/path.conf", NULL, NULL);
  CHECK("missing file: no crash", 1);
  /* shm_path must not contain the test-specific value from g_tmp_conf */
  CHECK("missing file: shm_path not from test conf",
        strcmp(cfg.shm_path, "/tmp/tt-cli-test-live.dat") != 0);
}

/* ------------------------------------------------------------------ */

int main(void) {
  printf("=== CLI config unit tests ===\n");
  write_tmp_conf();

  test_config_load();
  test_config_override();
  test_config_missing_file();

  unlink(g_tmp_conf);

  printf("\n  %d/%d passed\n", g_run - g_fail, g_run);
  return g_fail ? 1 : 0;
}
