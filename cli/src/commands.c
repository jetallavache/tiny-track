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

#include "common/ringbuf.h"
#include "output.h"
#include "reader.h"

static pid_t read_pidfile(const char* path) {
  FILE* f = fopen(path, "r");
  if (!f)
    return -1;
  pid_t pid = -1;
  fscanf(f, "%d", &pid);
  fclose(f);
  return pid;
}

static int daemon_running(const struct ttc_ctx* ctx) {
  pid_t pid = read_pidfile(ctx->pid_file);
  if (pid <= 0)
    return 0;
  return kill(pid, 0) == 0;
}

static int open_reader(const struct ttc_ctx* ctx, struct ttc_reader* r) {
  int err = ttc_reader_open(r, ctx->mmap_path);
  if (err != TTR_READER_OK) {
    fprintf(stderr, "Error: cannot open %s: %s\n", ctx->mmap_path,
            ttc_reader_strerror(err));
  }
  return err;
}

int ttc_cmd_status(const struct ttc_ctx* ctx) {
  int running = daemon_running(ctx);
  pid_t pid = read_pidfile(ctx->pid_file);

  if (ctx->format == FMT_JSON) {
    printf("{\n");
    printf("  \"daemon\": \"%s\",\n", running ? "running" : "stopped");
    printf("  \"pid\": %d,\n", (int)pid);
    printf("  \"mmap\": \"%s\"\n", ctx->mmap_path);
    printf("}\n");
    return 0;
  }

  ttc_print_sep(ctx, 44);
  printf(" %sTinyTrack Status%s\n", ttc_color(ctx, COL_BOLD),
         ttc_color(ctx, COL_RESET));
  ttc_print_sep(ctx, 44);

  printf(" %-20s %s%s%s\n", "Daemon:",
         running ? ttc_color(ctx, COL_GREEN) : ttc_color(ctx, COL_RED),
         running ? "running" : "stopped", ttc_color(ctx, COL_RESET));

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

int ttc_cmd_metrics(const struct ttc_ctx* ctx) {
  struct ttc_reader r;
  if (open_reader(ctx, &r) != TTR_READER_OK)
    return 1;

  /* Single shot if not a tty or JSON */
  int loop = (ctx->format != FMT_JSON) && isatty(STDOUT_FILENO);

  do {
    struct tt_metrics m;
    int err = ttc_reader_get_latest(&r, &m);
    if (err == TTR_READER_OK) {
      if (loop)
        printf("\033[H\033[J"); /* clear screen */
      ttc_print_metrics(ctx, &m);
    } else if (err == TTR_READER_ERR_STALE) {
      fprintf(stderr, "%sWarning: daemon not running%s\n",
              ttc_color(ctx, COL_YELLOW), ttc_color(ctx, COL_RESET));
      break;
    } else if (err == TTR_READER_ERR_NODATA) {
      fprintf(stderr, "Waiting for data...\n");
    }
    if (loop)
      usleep(ctx->interval_ms * 1000);
  } while (loop);

  ttc_reader_close(&r);
  return 0;
}

int ttc_cmd_history(const struct ttc_ctx* ctx, int level, int count) {
  struct ttc_reader r;
  if (open_reader(ctx, &r) != TTR_READER_OK)
    return 1;

  if (count <= 0 || count > 1000)
    count = 20;

  struct tt_metrics* buf = calloc(count, sizeof(*buf));
  if (!buf) {
    ttc_reader_close(&r);
    return 1;
  }

  int n = ttc_reader_get_history(&r, level, buf, count);
  if (n <= 0) {
    fprintf(stderr, "No history data for L%d\n", level);
    free(buf);
    ttc_reader_close(&r);
    return 1;
  }

  if (ctx->format == FMT_JSON)
    printf("[\n");

  for (int i = 0; i < n; i++) {
    if (ctx->format == FMT_JSON) {
      ttc_print_metrics(ctx, &buf[i]);
      if (i < n - 1)
        printf(",\n");
    } else {
      ttc_print_metrics(ctx, &buf[i]);
    }
  }

  if (ctx->format == FMT_JSON)
    printf("]\n");

  free(buf);
  ttc_reader_close(&r);
  return 0;
}

int ttc_cmd_signal(const struct ttc_ctx* ctx, const char* signame) {
  pid_t pid = read_pidfile(ctx->pid_file);
  if (pid <= 0) {
    fprintf(stderr, "Error: daemon not running (no pid file)\n");
    return 1;
  }

  int signo = 0;
  if (strcmp(signame, "hup") == 0 || strcmp(signame, "SIGHUP") == 0)
    signo = SIGHUP;
  else if (strcmp(signame, "usr1") == 0 || strcmp(signame, "SIGUSR1") == 0)
    signo = SIGUSR1;
  else if (strcmp(signame, "usr2") == 0 || strcmp(signame, "SIGUSR2") == 0)
    signo = SIGUSR2;
  else if (strcmp(signame, "term") == 0 || strcmp(signame, "SIGTERM") == 0)
    signo = SIGTERM;
  else {
    fprintf(stderr, "Unknown signal: %s (use: hup, usr1, usr2, term)\n",
            signame);
    return 1;
  }

  if (kill(pid, signo) < 0) {
    fprintf(stderr, "Error sending %s to pid %d: %s\n", signame, (int)pid,
            strerror(errno));
    return 1;
  }

  printf("Sent %s to tinytd (pid %d)\n", signame, (int)pid);
  return 0;
}

/* Query a single property from systemctl show */
static int systemd_available(void) {
  return system("systemctl is-system-running --quiet 2>/dev/null") != 127;
}

static void systemd_show_status(const struct ttc_ctx* ctx) {
  /* Print structured status from systemctl */
  char cmd[256];
  snprintf(cmd, sizeof(cmd),
           "systemctl show tinytd --property=ActiveState,SubState,"
           "MainPID,ExecMainStartTimestamp,LoadState 2>/dev/null");
  FILE* f = popen(cmd, "r");
  if (!f)
    return;

  char line[256];
  while (fgets(line, sizeof(line), f)) {
    line[strcspn(line, "\n")] = '\0';
    char* eq = strchr(line, '=');
    if (!eq)
      continue;
    *eq = '\0';
    const char* key = line;
    const char* val = eq + 1;

    const char* color = ttc_color(ctx, COL_RESET);
    if (strcmp(key, "ActiveState") == 0) {
      color = strcmp(val, "active") == 0 ? ttc_color(ctx, COL_GREEN)
                                         : ttc_color(ctx, COL_RED);
    }
    printf(" %-32s %s%s%s\n", key, color, val, ttc_color(ctx, COL_RESET));
  }
  pclose(f);
}

int ttc_cmd_service(const struct ttc_ctx* ctx, const char* action) {
  int use_systemd = systemd_available();
  char cmd[512];

  if (strcmp(action, "status") == 0) {
    ttc_print_sep(ctx, 44);
    printf(" %sService Status%s\n", ttc_color(ctx, COL_BOLD),
           ttc_color(ctx, COL_RESET));
    ttc_print_sep(ctx, 44);
    if (use_systemd)
      systemd_show_status(ctx);
    else
      return ttc_cmd_status(ctx);
    return 0;
  }

  if (strcmp(action, "start") == 0) {
    if (use_systemd)
      snprintf(cmd, sizeof(cmd), "systemctl start tinytd");
    else if (daemon_running(ctx)) {
      printf("tinytd is already running\n");
      return 0;
    } else
      snprintf(cmd, sizeof(cmd), "tinytd '%s' &", ctx->config_path);

  } else if (strcmp(action, "stop") == 0) {
    if (use_systemd)
      snprintf(cmd, sizeof(cmd), "systemctl stop tinytd");
    else
      snprintf(cmd, sizeof(cmd), "kill $(cat '%s' 2>/dev/null) 2>/dev/null",
               ctx->pid_file);

  } else if (strcmp(action, "restart") == 0) {
    if (use_systemd)
      snprintf(cmd, sizeof(cmd), "systemctl restart tinytd");
    else
      snprintf(
          cmd, sizeof(cmd),
          "kill $(cat '%s' 2>/dev/null) 2>/dev/null; sleep 1; tinytd '%s' &",
          ctx->pid_file, ctx->config_path);

  } else if (strcmp(action, "enable") == 0 || strcmp(action, "disable") == 0) {
    if (!use_systemd) {
      fprintf(stderr, "systemd not available\n");
      return 1;
    }
    snprintf(cmd, sizeof(cmd), "systemctl %s tinytd", action);

  } else {
    fprintf(stderr,
            "Unknown action: %s (start|stop|restart|status|enable|disable)\n",
            action);
    return 1;
  }

  int ret = system(cmd);
  if (ret == 0 && ctx->format != FMT_JSON)
    printf("OK\n");
  return ret == 0 ? 0 : 1;
}

int ttc_cmd_logs(const struct ttc_ctx* ctx, int lines, const char* level) {
  if (lines <= 0)
    lines = 50;

  char cmd[256];
  /* Try journalctl first */
  if (system("journalctl --version >/dev/null 2>&1") == 0) {
    if (level && strlen(level) > 0)
      snprintf(cmd, sizeof(cmd), "journalctl -u tinytd -n %d -p %s --no-pager",
               lines, level);
    else
      snprintf(cmd, sizeof(cmd), "journalctl -u tinytd -n %d --no-pager",
               lines);
  } else {
    /* Fallback: grep syslog */
    snprintf(cmd, sizeof(cmd),
             "grep tinytd /var/log/syslog 2>/dev/null | tail -n %d"
             " || grep tinytd /var/log/messages 2>/dev/null | tail -n %d",
             lines, lines);
  }

  return system(cmd);
}

int ttc_cmd_script(const struct ttc_ctx* ctx, const char* path) {
  FILE* f = strcmp(path, "-") == 0 ? stdin : fopen(path, "r");
  if (!f) {
    fprintf(stderr, "Error: cannot open script: %s\n", path);
    return 1;
  }

  char line[512];
  int lineno = 0, errors = 0;

  while (fgets(line, sizeof(line), f)) {
    lineno++;
    /* Strip newline and leading whitespace */
    char* p = line;
    while (*p == ' ' || *p == '\t')
      p++;
    p[strcspn(p, "\n\r")] = '\0';

    /* Skip empty lines and comments */
    if (*p == '\0' || *p == '#')
      continue;

    /* Expand simple $VAR references */
    char expanded[512];
    char* dst = expanded;
    for (char* s = p; *s && dst < expanded + sizeof(expanded) - 1; s++) {
      if (*s == '$' && *(s + 1)) {
        s++;
        char varname[64];
        int vn = 0;
        while (*s &&
               ((*s >= 'A' && *s <= 'Z') || (*s >= 'a' && *s <= 'z') ||
                (*s >= '0' && *s <= '9') || *s == '_') &&
               vn < 63)
          varname[vn++] = *s++;
        varname[vn] = '\0';
        s--;
        const char* val = getenv(varname);
        if (val) {
          strncpy(dst, val, expanded + sizeof(expanded) - dst - 1);
          dst += strlen(val);
        }
      } else {
        *dst++ = *s;
      }
    }
    *dst = '\0';

    if (ctx->verbose)
      printf("[script:%d] %s\n", lineno, expanded);

    /* Build argv and dispatch to existing commands */
    /* Simple approach: prepend "tiny-cli" and re-parse via execvp */
    char* argv[32];
    int argc = 0;
    char buf[512];
    strncpy(buf, expanded, sizeof(buf) - 1);
    char* tok = strtok(buf, " \t");
    while (tok && argc < 31) {
      argv[argc++] = tok;
      tok = strtok(NULL, " \t");
    }
    argv[argc] = NULL;
    if (argc == 0)
      continue;

    /* Dispatch the first token as a tiny-cli command */
    char full_cmd[600];
    snprintf(full_cmd, sizeof(full_cmd), "tiny-cli");
    for (int i = 0; i < argc; i++) {
      strncat(full_cmd, " ", sizeof(full_cmd) - strlen(full_cmd) - 1);
      strncat(full_cmd, argv[i], sizeof(full_cmd) - strlen(full_cmd) - 1);
    }
    int ret = system(full_cmd);
    if (ret != 0) {
      fprintf(stderr, "[script:%d] command failed: %s\n", lineno, expanded);
      errors++;
    }
  }

  if (f != stdin)
    fclose(f);
  return errors > 0 ? 1 : 0;
}

int ttc_cmd_debug(const struct ttc_ctx* ctx) {
  ttc_print_sep(ctx, 44);
  printf(" %sTinyTrack Diagnostics%s\n", ttc_color(ctx, COL_BOLD),
         ttc_color(ctx, COL_RESET));
  ttc_print_sep(ctx, 44);

  /* mmap file integrity */
  struct stat st;
  int live_ok = stat(ctx->mmap_path, &st) == 0;
  printf(" %-24s %s%s%s (%ld bytes)\n", "live mmap:",
         live_ok ? ttc_color(ctx, COL_GREEN) : ttc_color(ctx, COL_RED),
         live_ok ? "OK" : "MISSING", ttc_color(ctx, COL_RESET),
         live_ok ? (long)st.st_size : 0L);

  /* Try to open and validate magic */
  struct ttc_reader r;
  int err = ttc_reader_open(&r, ctx->mmap_path);
  printf(" %-24s %s%s%s\n", "mmap magic:",
         err == TTR_READER_OK ? ttc_color(ctx, COL_GREEN)
                              : ttc_color(ctx, COL_RED),
         err == TTR_READER_OK ? "valid" : ttc_reader_strerror(err),
         ttc_color(ctx, COL_RESET));

  if (err == TTR_READER_OK) {
    char ts[16];
    ttc_fmt_ts(r.ring.l1_meta->last_ts, ts, sizeof(ts));
    printf(" %-24s %s\n", "last L1 write:", ts);
    printf(" %-24s %u/%u\n", "L1 fill:", r.ring.l1_meta->head,
           r.ring.l1_meta->capacity);
    ttc_reader_close(&r);
  }

  /* Daemon */
  printf(
      " %-24s %s%s%s\n", "daemon:",
      daemon_running(ctx) ? ttc_color(ctx, COL_GREEN) : ttc_color(ctx, COL_RED),
      daemon_running(ctx) ? "running" : "stopped", ttc_color(ctx, COL_RESET));

  /* Config file */
  int cfg_ok = stat(ctx->config_path, &st) == 0;
  printf(" %-24s %s%s%s\n", "config file:",
         cfg_ok ? ttc_color(ctx, COL_GREEN) : ttc_color(ctx, COL_YELLOW),
         cfg_ok ? ctx->config_path : "not found (using defaults)",
         ttc_color(ctx, COL_RESET));

  return 0;
}

int ttc_cmd_version(const struct ttc_ctx* ctx) {
  if (ctx->format == FMT_JSON) {
    printf("{\"version\": \"0.1.0\", \"proto\": 1}\n");
    return 0;
  }
  printf("tiny-cli 0.1.0  (TinyTrack protocol v1)\n");
  return 0;
}
