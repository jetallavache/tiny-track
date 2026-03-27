#include <getopt.h>
#include <grp.h>
#include <pwd.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <unistd.h>

#include "common/log.h"
#include "config.h"
#include "http.h"
#include "net.h"
#include "reader.h"
#include "session.h"

static volatile sig_atomic_t running = 1;

static void signal_handler(int sig) {
  (void)sig;
  running = 0;
}

static void daemonize(void) {
  pid_t pid = fork();
  if (pid < 0) exit(EXIT_FAILURE);
  if (pid > 0) exit(EXIT_SUCCESS);

  if (setsid() < 0) exit(EXIT_FAILURE);

  signal(SIGCHLD, SIG_IGN);
  signal(SIGHUP, SIG_IGN);

  pid = fork();
  if (pid < 0) exit(EXIT_FAILURE);
  if (pid > 0) exit(EXIT_SUCCESS);

  umask(0);
  chdir("/");

  for (int fd = sysconf(_SC_OPEN_MAX); fd >= 0; fd--)
    close(fd);
}

static int write_pid_file(const char *path) {
  FILE *f = fopen(path, "w");
  if (!f) return -1;
  fprintf(f, "%d\n", getpid());
  fclose(f);
  return 0;
}

static int drop_privileges(const char *user, const char *group) {
  struct group *gr = getgrnam(group);
  if (!gr) { tt_log_err("Unknown group: %s", group); return -1; }
  if (setgid(gr->gr_gid) < 0) { tt_log_err("setgid failed"); return -1; }

  struct passwd *pw = getpwnam(user);
  if (!pw) { tt_log_err("Unknown user: %s", user); return -1; }
  if (setuid(pw->pw_uid) < 0) { tt_log_err("setuid failed"); return -1; }

  return 0;
}

int main(int argc, char **argv) {
  const char *config_path = NULL;
  const char *listen_override = NULL;
  const char *shm_override = NULL;
  static char listen_buf[64];
  int do_daemonize = 0;

  static const struct option long_opts[] = {
      {"config", required_argument, NULL, 'c'},
      {"port",   required_argument, NULL, 'p'},
      {"listen", required_argument, NULL, 'l'},
      {"shm",    required_argument, NULL, 's'},
      {"daemon", no_argument,       NULL, 'd'},
      {"help",   no_argument,       NULL, 'h'},
      {NULL, 0, NULL, 0},
  };

  int opt;
  while ((opt = getopt_long(argc, argv, "c:p:l:s:dh", long_opts, NULL)) != -1) {
    switch (opt) {
      case 'c': config_path     = optarg; break;
      case 'l': listen_override = optarg; break;
      case 's': shm_override    = optarg; break;
      case 'd': do_daemonize    = 1;      break;
      case 'p':
        snprintf(listen_buf, sizeof(listen_buf), "ws://0.0.0.0:%s", optarg);
        listen_override = listen_buf;
        break;
      case 'h':
        printf("Usage: tinytrack [-d] [-c CONFIG] [-p PORT] "
               "[-l ws://HOST:PORT] [-s SHM_PATH]\n\n"
               "Options:\n"
               "  -d             Run as daemon (background)\n"
               "  -c CONFIG      Path to configuration file\n"
               "  -p PORT        Listen port (shorthand for -l)\n"
               "  -l ws://H:P    Listen address\n"
               "  -s SHM_PATH    Path to tinytd live mmap file\n"
               "  -h             Show this help and exit\n\n"
               "Signals:\n"
               "  SIGTERM/SIGINT  Graceful shutdown\n");
        return 0;
      default:
        fprintf(stderr, "Try 'tinytrack -h' for usage.\n");
        return 1;
    }
  }

  struct ttg_config cfg;
  ttg_config_load(&cfg, config_path, listen_override, shm_override);

  /* Daemonize before tt_log_init (closes all fds) */
  if (do_daemonize)
    daemonize();

  struct tt_log_config log_cfg = {
      .backend   = cfg.log_backend,
      .min_level = cfg.log_level,
      .ident     = "tinytrack",
      .async     = false,
  };
  tt_log_init(&log_cfg);
  tt_log_notice("tinytrack gateway starting...");

  signal(SIGTERM, signal_handler);
  signal(SIGINT, signal_handler);

  static struct ttg_reader reader;
  if (ttg_reader_open(&reader, cfg.shm_path) != 0) {
    tt_log_err("Failed to open mmap: %s", cfg.shm_path);
    return 1;
  }
  tt_log_info("Opened mmap: %s", cfg.shm_path);

  if (write_pid_file(cfg.pid_file) < 0)
    tt_log_warning("Failed to write pid file: %s", cfg.pid_file);

  if (getuid() == 0) {
    if (drop_privileges(cfg.user, cfg.group) < 0) {
      tt_log_err("Failed to drop privileges");
      ttg_reader_close(&reader);
      unlink(cfg.pid_file);
      return 1;
    }
    tt_log_info("Privileges dropped to %s:%s", cfg.user, cfg.group);
  }

  ttg_session_init(&reader);

  struct ttg_mgr mgr;
  ttg_net_mgr_init(&mgr);
  ttg_net_timer_add(&mgr, 500, TIMER_REPEAT, ttg_session_timer_fn, &mgr);

  tt_log_info("WS listener on %s/websocket", cfg.listen);
  tt_log_info("HTTP API on %s/api/metrics/live", cfg.listen);

  ttg_http_listen(&mgr, cfg.listen, ttg_session_event_fn, NULL);

  while (running)
    ttg_net_mgr_poll(&mgr, 500);

  ttg_net_mgr_free(&mgr);
  ttg_reader_close(&reader);
  unlink(cfg.pid_file);
  tt_log_notice("tinytrack gateway shutting down...");
  tt_log_shutdown();

  return 0;
}
