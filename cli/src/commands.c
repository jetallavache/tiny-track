#include "commands.h"

#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>

#include "output.h"
#include "reader.h"
#include "common/ringbuf/layout.h"

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

static pid_t read_pidfile(const char* path) {
  FILE* f = fopen(path, "r");
  if (!f) return -1;
  pid_t pid = -1;
  fscanf(f, "%d", &pid);
  fclose(f);
  return pid;
}

static int daemon_running(const struct ttc_ctx* ctx) {
  pid_t pid = read_pidfile(ctx->pid_file);
  if (pid <= 0) return 0;
  return kill(pid, 0) == 0;
}

static int open_reader(const struct ttc_ctx* ctx, struct ttc_reader* r) {
  int err = ttc_reader_open(r, ctx->mmap_path);
  if (err != TTR_READER_OK) {
    fprintf(stderr, "Error: cannot open %s: %s\n",
            ctx->mmap_path, ttc_reader_strerror(err));
  }
  return err;
}

/* ------------------------------------------------------------------ */
/* status                                                               */
/* ------------------------------------------------------------------ */

int ttc_cmd_status(const struct ttc_ctx* ctx) {
  int running = daemon_running(ctx);
  pid_t pid   = read_pidfile(ctx->pid_file);

  if (ctx->format == FMT_JSON) {
    printf("{\n");
    printf("  \"daemon\": \"%s\",\n", running ? "running" : "stopped");
    printf("  \"pid\": %d,\n", (int)pid);
    printf("  \"mmap\": \"%s\"\n", ctx->mmap_path);
    printf("}\n");
    return 0;
  }

  ttc_print_sep(ctx, 44);
  printf(" %sTinyTrack Status%s\n",
         ttc_color(ctx, COL_BOLD), ttc_color(ctx, COL_RESET));
  ttc_print_sep(ctx, 44);

  printf(" %-20s %s%s%s\n", "Daemon:",
         running ? ttc_color(ctx, COL_GREEN) : ttc_color(ctx, COL_RED),
         running ? "running" : "stopped",
         ttc_color(ctx, COL_RESET));

  if (pid > 0)
    printf(" %-20s %d\n", "PID:", (int)pid);

  printf(" %-20s %s\n", "mmap path:", ctx->mmap_path);
  printf(" %-20s %s\n", "config:", ctx->config_path);

  /* Try to open mmap and show ring stats */
  struct ttc_reader r;
  if (open_reader(ctx, &r) == TTR_READER_OK) {
    printf("\n");
    ttc_print_ring_level(ctx, 1, r.ring.l1_meta, "1h@1s");
    ttc_print_ring_level(ctx, 2, r.ring.l2_meta, "24h@1m");
    ttc_print_ring_level(ctx, 3, r.ring.l3_meta, "7d@15m");
    ttc_reader_close(&r);
  }

  return running ? 0 : 1;
}

/* ------------------------------------------------------------------ */
/* metrics (live)                                                       */
/* ------------------------------------------------------------------ */

int ttc_cmd_metrics(const struct ttc_ctx* ctx) {
  struct ttc_reader r;
  if (open_reader(ctx, &r) != TTR_READER_OK) return 1;

  /* Single shot if not a tty or JSON */
  int loop = (ctx->format != FMT_JSON) && isatty(STDOUT_FILENO);

  do {
    struct tt_metrics m;
    int err = ttc_reader_get_latest(&r, &m);
    if (err == TTR_READER_OK) {
      if (loop) printf("\033[H\033[J"); /* clear screen */
      ttc_print_metrics(ctx, &m);
    } else if (err == TTR_READER_ERR_STALE) {
      fprintf(stderr, "%sWarning: daemon not running%s\n",
              ttc_color(ctx, COL_YELLOW), ttc_color(ctx, COL_RESET));
      break;
    } else if (err == TTR_READER_ERR_NODATA) {
      fprintf(stderr, "Waiting for data...\n");
    }
    if (loop) usleep(ctx->interval_ms * 1000);
  } while (loop);

  ttc_reader_close(&r);
  return 0;
}

/* ------------------------------------------------------------------ */
/* history                                                              */
/* ------------------------------------------------------------------ */

int ttc_cmd_history(const struct ttc_ctx* ctx, int level, int count) {
  struct ttc_reader r;
  if (open_reader(ctx, &r) != TTR_READER_OK) return 1;

  if (count <= 0 || count > 1000) count = 20;

  struct tt_metrics* buf = calloc(count, sizeof(*buf));
  if (!buf) { ttc_reader_close(&r); return 1; }

  int n = ttc_reader_get_history(&r, level, buf, count);
  if (n <= 0) {
    fprintf(stderr, "No history data for L%d\n", level);
    free(buf); ttc_reader_close(&r);
    return 1;
  }

  if (ctx->format == FMT_JSON) printf("[\n");

  for (int i = 0; i < n; i++) {
    if (ctx->format == FMT_JSON) {
      ttc_print_metrics(ctx, &buf[i]);
      if (i < n - 1) printf(",\n");
    } else {
      ttc_print_metrics(ctx, &buf[i]);
    }
  }

  if (ctx->format == FMT_JSON) printf("]\n");

  free(buf);
  ttc_reader_close(&r);
  return 0;
}

/* ------------------------------------------------------------------ */
/* signal                                                               */
/* ------------------------------------------------------------------ */

int ttc_cmd_signal(const struct ttc_ctx* ctx, const char* signame) {
  pid_t pid = read_pidfile(ctx->pid_file);
  if (pid <= 0) {
    fprintf(stderr, "Error: daemon not running (no pid file)\n");
    return 1;
  }

  int signo = 0;
  if (strcmp(signame, "hup")   == 0 || strcmp(signame, "SIGHUP")   == 0) signo = SIGHUP;
  else if (strcmp(signame, "usr1") == 0 || strcmp(signame, "SIGUSR1") == 0) signo = SIGUSR1;
  else if (strcmp(signame, "usr2") == 0 || strcmp(signame, "SIGUSR2") == 0) signo = SIGUSR2;
  else if (strcmp(signame, "term") == 0 || strcmp(signame, "SIGTERM") == 0) signo = SIGTERM;
  else {
    fprintf(stderr, "Unknown signal: %s (use: hup, usr1, usr2, term)\n", signame);
    return 1;
  }

  if (kill(pid, signo) < 0) {
    fprintf(stderr, "Error sending %s to pid %d: %s\n",
            signame, (int)pid, strerror(errno));
    return 1;
  }

  printf("Sent %s to tinytd (pid %d)\n", signame, (int)pid);
  return 0;
}

/* ------------------------------------------------------------------ */
/* service                                                              */
/* ------------------------------------------------------------------ */

int ttc_cmd_service(const struct ttc_ctx* ctx, const char* action) {
  /* Try systemctl first, fall back to direct process management */
  char cmd[256];

  if (strcmp(action, "start") == 0) {
    if (daemon_running(ctx)) {
      printf("tinytd is already running\n");
      return 0;
    }
    snprintf(cmd, sizeof(cmd),
             "systemctl start tinytd 2>/dev/null || "
             "tinytd %s &", ctx->config_path);
  } else if (strcmp(action, "stop") == 0) {
    snprintf(cmd, sizeof(cmd),
             "systemctl stop tinytd 2>/dev/null || "
             "kill $(cat %s 2>/dev/null) 2>/dev/null", ctx->pid_file);
  } else if (strcmp(action, "restart") == 0) {
    snprintf(cmd, sizeof(cmd),
             "systemctl restart tinytd 2>/dev/null || { "
             "kill $(cat %s 2>/dev/null) 2>/dev/null; sleep 1; tinytd %s & }",
             ctx->pid_file, ctx->config_path);
  } else if (strcmp(action, "status") == 0) {
    return ttc_cmd_status(ctx);
  } else if (strcmp(action, "enable") == 0 || strcmp(action, "disable") == 0) {
    snprintf(cmd, sizeof(cmd), "systemctl %s tinytd", action);
  } else {
    fprintf(stderr, "Unknown action: %s (start|stop|restart|status|enable|disable)\n",
            action);
    return 1;
  }

  return system(cmd);
}

/* ------------------------------------------------------------------ */
/* debug                                                                */
/* ------------------------------------------------------------------ */

int ttc_cmd_debug(const struct ttc_ctx* ctx) {
  ttc_print_sep(ctx, 44);
  printf(" %sTinyTrack Diagnostics%s\n",
         ttc_color(ctx, COL_BOLD), ttc_color(ctx, COL_RESET));
  ttc_print_sep(ctx, 44);

  /* mmap file integrity */
  struct stat st;
  int live_ok = stat(ctx->mmap_path, &st) == 0;
  printf(" %-24s %s%s%s (%ld bytes)\n", "live mmap:",
         live_ok ? ttc_color(ctx, COL_GREEN) : ttc_color(ctx, COL_RED),
         live_ok ? "OK" : "MISSING",
         ttc_color(ctx, COL_RESET),
         live_ok ? (long)st.st_size : 0L);

  /* Try to open and validate magic */
  struct ttc_reader r;
  int err = ttc_reader_open(&r, ctx->mmap_path);
  printf(" %-24s %s%s%s\n", "mmap magic:",
         err == TTR_READER_OK ? ttc_color(ctx, COL_GREEN) : ttc_color(ctx, COL_RED),
         err == TTR_READER_OK ? "valid" : ttc_reader_strerror(err),
         ttc_color(ctx, COL_RESET));

  if (err == TTR_READER_OK) {
    char ts[16];
    ttc_fmt_ts(r.ring.l1_meta->last_ts, ts, sizeof(ts));
    printf(" %-24s %s\n", "last L1 write:", ts);
    printf(" %-24s %u/%u\n", "L1 fill:",
           r.ring.l1_meta->head, r.ring.l1_meta->capacity);
    ttc_reader_close(&r);
  }

  /* Daemon */
  printf(" %-24s %s%s%s\n", "daemon:",
         daemon_running(ctx) ? ttc_color(ctx, COL_GREEN) : ttc_color(ctx, COL_RED),
         daemon_running(ctx) ? "running" : "stopped",
         ttc_color(ctx, COL_RESET));

  /* Config file */
  int cfg_ok = stat(ctx->config_path, &st) == 0;
  printf(" %-24s %s%s%s\n", "config file:",
         cfg_ok ? ttc_color(ctx, COL_GREEN) : ttc_color(ctx, COL_YELLOW),
         cfg_ok ? ctx->config_path : "not found (using defaults)",
         ttc_color(ctx, COL_RESET));

  return 0;
}

/* ------------------------------------------------------------------ */
/* version                                                              */
/* ------------------------------------------------------------------ */

int ttc_cmd_version(const struct ttc_ctx* ctx) {
  if (ctx->format == FMT_JSON) {
    printf("{\"version\": \"0.1.0\", \"proto\": 1}\n");
    return 0;
  }
  printf("tiny-cli 0.1.0  (TinyTrack protocol v1)\n");
  return 0;
}
