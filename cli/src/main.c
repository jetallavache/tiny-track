#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "commands.h"
#include "common/config.h"
#include "common/log.h"

static void print_usage(void) {
  printf("Usage: tiny-cli [command] [options]\n\n");
  printf("Commands:\n");
  printf("  status              Show daemon status\n");
  printf("  live                Show live metrics (updates every second)\n");
  printf("  history             Show historical metrics\n");
  printf("  version             Show version\n\n");
  printf("Options:\n");
  printf(
      "  --path PATH         Path to mmap file (default: "
      "/dev/shm/tinytd-live.dat)\n");
  printf("  --interval MS       Update interval in ms (default: 1000)\n");
  printf(
      "  --format FORMAT     Output format: table|json|compact (default: "
      "table)\n");
  printf("  --range RANGE       Time range: 1h, 24h, 7d\n");
  printf("  --level LEVEL       Ring level: l1, l2, l3\n");
}

int main(int argc, char** argv) {
  if (argc < 2) {
    print_usage();
    return 1;
  }

  const char* cmd = argv[1];
  const char* path = tt_config_live_path();
  int interval_ms = 1000;
  const char* format = "table";
  const char* range = "1h";
  int level = 1;
  int eval = 0;

  /* Setup logging */
  tt_log_config_t log_cfg = {.backend = TT_LOG_BACKEND_STDOUT,
                             .min_level = TT_LOG_INFO,
                             .ident = "tiny-cli",
                             .async = false};
  tt_log_init(&log_cfg);

  /* Debug info */
  tt_log_info("tiny-cli starting, command=%s", cmd);
  tt_log_info("mmap path=%s", path);
  const char* env_live = getenv("TINYTRACK_LIVE_PATH");
  tt_log_info("ENV: TINYTRACK_LIVE_PATH=%s", env_live ? env_live : "(not set)");

  /* /* Clean up old files if they exist (for debugging) */ */
  /* unlink(path); */

  /* Parse options */
  for (int i = 2; i < argc; i++) {
    if (strcmp(argv[i], "--path") == 0 && i + 1 < argc) {
      path = argv[++i];
    } else if (strcmp(argv[i], "--interval") == 0 && i + 1 < argc) {
      interval_ms = atoi(argv[++i]);
    } else if (strcmp(argv[i], "--format") == 0 && i + 1 < argc) {
      format = argv[++i];
    } else if (strcmp(argv[i], "--range") == 0 && i + 1 < argc) {
      range = argv[++i];
    } else if (strcmp(argv[i], "--level") == 0 && i + 1 < argc) {
      const char* lvl = argv[++i];
      if (strcmp(lvl, "l1") == 0)
        level = 1;
      else if (strcmp(lvl, "l2") == 0)
        level = 2;
      else if (strcmp(lvl, "l3") == 0)
        level = 3;
    }
  }

  /* Execute command */
  if (strcmp(cmd, "status") == 0) {
    eval = ttc_cmd_status(path);
  } else if (strcmp(cmd, "live") == 0) {
    eval = ttc_cmd_live(path, interval_ms, format);
  } else if (strcmp(cmd, "history") == 0) {
    eval = ttc_cmd_history(path, range, level);
  } else if (strcmp(cmd, "version") == 0 || strcmp(cmd, "--version") == 0) {
    eval = ttc_cmd_version();
  } else {
    fprintf(stderr, "Unknown command: %s\n", cmd);
    print_usage();
    eval = 1;
  }

  tt_log_shutdown();
  return eval;
}
