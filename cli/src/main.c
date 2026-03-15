#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "commands.h"
#include "ctx.h"
#include "dashboard.h"
#include "output.h"

static void usage(void) {
  printf(
    "Usage: tiny-cli [options] <command> [args]\n"
    "\n"
    "Options:\n"
    "  --path PATH       mmap file path (default: $TINYTRACK_LIVE_PATH)\n"
    "  --config PATH     config file path\n"
    "  --pid PATH        pid file path\n"
    "  --format FORMAT   output format: table|json|compact\n"
    "  --interval MS     refresh interval in ms (default: 1000)\n"
    "  --no-color        disable ANSI colors\n"
    "  --verbose         verbose output\n"
    "\n"
    "Commands:\n"
    "  status            Show daemon and ring buffer status\n"
    "  metrics           Show live metrics (refreshes every --interval ms)\n"
    "  history [LEVEL]   Show history: l1 (1h), l2 (24h), l3 (7d)\n"
    "  signal SIGNAME    Send signal to daemon: hup, usr1, usr2, term\n"
    "  service ACTION    Manage service: start, stop, restart, enable, disable\n"
    "  debug             Diagnostics and integrity check\n"
    "  dashboard         Interactive ncurses dashboard\n"
    "  version           Show version\n"
  );
}

int main(int argc, char** argv) {
  struct ttc_ctx ctx;
  ttc_ctx_init(&ctx);

  int i = 1;

  /* Parse global options (before command) */
  for (; i < argc && argv[i][0] == '-'; i++) {
    if (strcmp(argv[i], "--path") == 0 && i + 1 < argc) {
      ctx.mmap_path = argv[++i];
    } else if (strcmp(argv[i], "--config") == 0 && i + 1 < argc) {
      ctx.config_path = argv[++i];
    } else if (strcmp(argv[i], "--pid") == 0 && i + 1 < argc) {
      ctx.pid_file = argv[++i];
    } else if (strcmp(argv[i], "--format") == 0 && i + 1 < argc) {
      const char* f = argv[++i];
      if (strcmp(f, "json") == 0)    ctx.format = FMT_JSON;
      else if (strcmp(f, "compact") == 0) ctx.format = FMT_COMPACT;
      else ctx.format = FMT_TABLE;
    } else if (strcmp(argv[i], "--interval") == 0 && i + 1 < argc) {
      ctx.interval_ms = atoi(argv[++i]);
    } else if (strcmp(argv[i], "--no-color") == 0) {
      ctx.color = false;
    } else if (strcmp(argv[i], "--verbose") == 0) {
      ctx.verbose = true;
    } else if (strcmp(argv[i], "--version") == 0) {
      return ttc_cmd_version(&ctx);
    } else if (strcmp(argv[i], "--help") == 0 || strcmp(argv[i], "-h") == 0) {
      usage(); return 0;
    } else {
      fprintf(stderr, "Unknown option: %s\n", argv[i]);
      usage(); return 1;
    }
  }

  if (i >= argc) { usage(); return 1; }

  const char* cmd = argv[i++];

  if (strcmp(cmd, "status") == 0) {
    return ttc_cmd_status(&ctx);

  } else if (strcmp(cmd, "metrics") == 0 || strcmp(cmd, "live") == 0) {
    return ttc_cmd_metrics(&ctx);

  } else if (strcmp(cmd, "history") == 0) {
    int level = 1, count = 20;
    for (; i < argc; i++) {
      if (strcmp(argv[i], "l1") == 0) level = 1;
      else if (strcmp(argv[i], "l2") == 0) level = 2;
      else if (strcmp(argv[i], "l3") == 0) level = 3;
      else if (strcmp(argv[i], "--count") == 0 && i + 1 < argc)
        count = atoi(argv[++i]);
    }
    return ttc_cmd_history(&ctx, level, count);

  } else if (strcmp(cmd, "signal") == 0) {
    if (i >= argc) {
      fprintf(stderr, "Usage: tiny-cli signal <hup|usr1|usr2|term>\n");
      return 1;
    }
    return ttc_cmd_signal(&ctx, argv[i]);

  } else if (strcmp(cmd, "service") == 0) {
    if (i >= argc) {
      fprintf(stderr, "Usage: tiny-cli service <start|stop|restart|status|enable|disable>\n");
      return 1;
    }
    return ttc_cmd_service(&ctx, argv[i]);

  } else if (strcmp(cmd, "debug") == 0) {
    return ttc_cmd_debug(&ctx);

  } else if (strcmp(cmd, "dashboard") == 0 || strcmp(cmd, "ui") == 0) {
    return ttc_cmd_dashboard(&ctx);

  } else if (strcmp(cmd, "version") == 0) {
    return ttc_cmd_version(&ctx);

  } else {
    fprintf(stderr, "Unknown command: %s\n", cmd);
    usage();
    return 1;
  }
}
