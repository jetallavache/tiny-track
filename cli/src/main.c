#include <getopt.h>
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
      "  -p, --path PATH       mmap file path (default: $TINYTRACK_LIVE_PATH)\n"
      "  -c, --config PATH     config file path\n"
      "  -P, --pid PATH        pid file path\n"
      "  -f, --format FORMAT   output format: table|json|compact\n"
      "  -i, --interval MS     refresh interval in ms (default: 1000)\n"
      "  -n, --no-color        disable ANSI colors\n"
      "  -v, --verbose         verbose output\n"
      "  -h, --help            show this help\n"
      "\n"
      "Commands:\n"
      "  status            Show daemon and ring buffer status\n"
      "  metrics           Show live metrics (refreshes every --interval ms)\n"
      "  history [LEVEL]   Show history: l1 (1h), l2 (24h), l3 (7d)\n"
      "  signal SIGNAME    Send signal to daemon: hup, usr1, usr2, term\n"
      "  service ACTION    Manage service: start, stop, restart, status, "
      "enable, disable\n"
      "  logs              Show daemon logs (journalctl integration)\n"
      "  debug             Diagnostics and integrity check\n"
      "  dashboard         Interactive ncurses dashboard\n"
      "  script FILE       Execute a script file (- for stdin)\n"
      "  version           Show version\n");
}

int main(int argc, char** argv) {
  struct ttc_ctx ctx;
  ttc_ctx_init(&ctx);

  static const struct option long_opts[] = {
      {"path",     required_argument, NULL, 'p'},
      {"config",   required_argument, NULL, 'c'},
      {"pid",      required_argument, NULL, 'P'},
      {"format",   required_argument, NULL, 'f'},
      {"interval", required_argument, NULL, 'i'},
      {"no-color", no_argument,       NULL, 'n'},
      {"verbose",  no_argument,       NULL, 'v'},
      {"version",  no_argument,       NULL, 'V'},
      {"help",     no_argument,       NULL, 'h'},
      {NULL, 0, NULL, 0},
  };

  int opt;
  while ((opt = getopt_long(argc, argv, "+p:c:P:f:i:nvVh",
                            long_opts, NULL)) != -1) {
    switch (opt) {
      case 'p': ctx.mmap_path   = optarg; break;
      case 'c': ctx.config_path = optarg; break;
      case 'P': ctx.pid_file    = optarg; break;
      case 'f':
        if (strcmp(optarg, "json") == 0)        ctx.format = FMT_JSON;
        else if (strcmp(optarg, "compact") == 0) ctx.format = FMT_COMPACT;
        else                                     ctx.format = FMT_TABLE;
        break;
      case 'i': ctx.interval_ms = atoi(optarg); break;
      case 'n': ctx.color   = false;            break;
      case 'v': ctx.verbose = true;             break;
      case 'V': return ttc_cmd_version(&ctx);
      case 'h': usage(); return 0;
      default:  usage(); return 1;
    }
  }

  if (optind >= argc) {
    usage();
    return 1;
  }

  const char* cmd = argv[optind++];

  if (strcmp(cmd, "status") == 0) {
    return ttc_cmd_status(&ctx);

  } else if (strcmp(cmd, "metrics") == 0 || strcmp(cmd, "live") == 0) {
    return ttc_cmd_metrics(&ctx);

  } else if (strcmp(cmd, "history") == 0) {
    int level = 1, count = 20;
    for (; optind < argc; optind++) {
      if (strcmp(argv[optind], "l1") == 0)
        level = 1;
      else if (strcmp(argv[optind], "l2") == 0)
        level = 2;
      else if (strcmp(argv[optind], "l3") == 0)
        level = 3;
      else if (strcmp(argv[optind], "--count") == 0 && optind + 1 < argc)
        count = atoi(argv[++optind]);
    }
    return ttc_cmd_history(&ctx, level, count);

  } else if (strcmp(cmd, "signal") == 0) {
    if (optind >= argc) {
      fprintf(stderr, "Usage: tiny-cli signal <hup|usr1|usr2|term>\n");
      return 1;
    }
    return ttc_cmd_signal(&ctx, argv[optind]);

  } else if (strcmp(cmd, "service") == 0) {
    if (optind >= argc) {
      fprintf(stderr,
              "Usage: tiny-cli service "
              "<start|stop|restart|status|enable|disable>\n");
      return 1;
    }
    return ttc_cmd_service(&ctx, argv[optind]);

  } else if (strcmp(cmd, "logs") == 0) {
    int lines = 50;
    const char* level = "";
    for (; optind < argc; optind++) {
      if (strcmp(argv[optind], "--lines") == 0 && optind + 1 < argc)
        lines = atoi(argv[++optind]);
      else if (strcmp(argv[optind], "--level") == 0 && optind + 1 < argc)
        level = argv[++optind];
      else
        lines = atoi(argv[optind]);
    }
    return ttc_cmd_logs(&ctx, lines, level);

  } else if (strcmp(cmd, "script") == 0) {
    if (optind >= argc) {
      fprintf(stderr, "Usage: tiny-cli script <file|->\n");
      return 1;
    }
    return ttc_cmd_script(&ctx, argv[optind]);

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
