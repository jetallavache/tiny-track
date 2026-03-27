#include <grp.h>
#include <pwd.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <unistd.h>

#include "collector.h"
#include "common/config.h"
#include "common/log.h"
#include "config.h"
#include "runtime.h"
#include "writer.h"

static volatile sig_atomic_t running = 1;

static void signal_handler(int sig) {
  (void)sig;
  running = 0;
}

static void daemonize(void) {
  pid_t pid = fork();
  if (pid < 0)
    exit(EXIT_FAILURE);
  if (pid > 0)
    exit(EXIT_SUCCESS);

  if (setsid() < 0)
    exit(EXIT_FAILURE);

  signal(SIGCHLD, SIG_IGN);
  signal(SIGHUP, SIG_IGN);

  pid = fork();
  if (pid < 0)
    exit(EXIT_FAILURE);
  if (pid > 0)
    exit(EXIT_SUCCESS);

  umask(0);
  chdir("/");

  for (int fd = sysconf(_SC_OPEN_MAX); fd >= 0; fd--)
    close(fd);
}

static int write_pid_file(const char* path) {
  FILE* f = fopen(path, "w");
  if (!f)
    return -1;
  fprintf(f, "%d\n", getpid());
  fclose(f);
  return 0;
}

static int drop_privileges(const char* user, const char* group) {
  struct group* gr = getgrnam(group);
  if (!gr) {
    tt_log_err("Unknown group: %s", group);
    return -1;
  }
  if (setgid(gr->gr_gid) < 0) {
    tt_log_err("setgid failed");
    return -1;
  }

  struct passwd* pw = getpwnam(user);
  if (!pw) {
    tt_log_err("Unknown user: %s", user);
    return -1;
  }
  if (setuid(pw->pw_uid) < 0) {
    tt_log_err("setuid failed");
    return -1;
  }

  return 0;
}

static void cleanup(struct ttd_runtime* rt, struct ttd_collector_state* cst,
                    struct ttd_writer* writer, const char* pid_file) {
  (void)cst;
  ttd_runtime_free(rt);
  ttd_collector_cleanup();
  ttd_writer_cleanup(writer);
  if (pid_file)
    unlink(pid_file);
}

int main(int argc, char** argv) {
  struct ttd_config cfg = {0};
  struct ttd_writer writer = {0};
  struct ttd_collector_state cst = {0};
  struct ttd_runtime rt = {0};
  int do_daemonize = 0;
  const char* config_path = NULL;

  int opt;
  while ((opt = getopt(argc, argv, "dc:h")) != -1) {
    switch (opt) {
      case 'd':
        do_daemonize = 1;
        break;
      case 'c':
        config_path = optarg;
        break;
      case 'h':
        printf(
            "Usage: tinytd [-d] [-c config-file]\n\n"
            "Options:\n"
            "  -d             Run as daemon (background)\n"
            "  -c config-file Path to configuration file\n"
            "                 Default: /etc/tinytrack/tinytrack.conf\n"
            "  -h             Show this help and exit\n\n"
            "Signals:\n"
            "  SIGTERM/SIGINT  Graceful shutdown\n");
        return 0;
      default:
        fprintf(stderr, "Try 'tinytd -h' for usage.\n");
        return 1;
    }
  }

  if (!config_path)
    config_path = tt_config_file_path();

  if (ttd_config_load(config_path, &cfg) < 0) {
    fprintf(stderr, "tinytd: cannot open config file: %s\n", config_path);
    perror("");
    return 1;
  }

  /* Daemonize before tt_log_init (closes all fds) */
  if (do_daemonize)
    daemonize();

  struct tt_log_config log_cfg = {.backend = cfg.log_backend,
                                  .min_level = cfg.log_level,
                                  .ident = "tinytd",
                                  .async = false};
  tt_log_init(&log_cfg);
  tt_log_notice("tinytd starting (config=%s)", config_path);

  /* Remove stale live file (shadow is kept for recovery) */
  unlink(cfg.live_path);

  if (ttd_writer_init(&writer, &cfg) < 0) {
    tt_log_err("Failed to initialize writer");
    return 1;
  }

  signal(SIGTERM, signal_handler);
  signal(SIGINT, signal_handler);

  ttd_collector_init();
  cst.du_path = cfg.du_path;
  cst.du_inval = cfg.du_interval_sec;

  if (ttd_runtime_init(&rt, &cfg, &cst, &writer) < 0) {
    ttd_collector_cleanup();
    ttd_writer_cleanup(&writer);
    return 1;
  }

  if (write_pid_file(cfg.pid_file) < 0)
    tt_log_warning("Failed to write pid file: %s", cfg.pid_file);

  if (getuid() == 0) {
    if (drop_privileges(cfg.user, cfg.group) < 0) {
      tt_log_err("Failed to drop privileges");
      cleanup(&rt, &cst, &writer, cfg.pid_file);
      return 1;
    }
    tt_log_info("Privileges dropped to %s:%s", cfg.user, cfg.group);
  }

  tt_log_info("tinytd started, interval=%u ms", cfg.interval_ms);

  while (running)
    ttd_runtime_poll(&rt, 1000);

  tt_log_notice("tinytd shutting down...");
  cleanup(&rt, &cst, &writer, cfg.pid_file);
  tt_log_shutdown();

  return 0;
}
