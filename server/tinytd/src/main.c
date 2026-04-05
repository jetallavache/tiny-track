#include <fcntl.h>
#include <getopt.h>
#include <grp.h>
#include <pwd.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <unistd.h>

#include "collector.h"
#include "common/config.h"
#include "common/log/log.h"
#include "common/sysfs.h"
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
  if (pid < 0) exit(EXIT_FAILURE);
  if (pid > 0) exit(EXIT_SUCCESS);

  if (setsid() < 0) exit(EXIT_FAILURE);

  signal(SIGCHLD, SIG_IGN);
  signal(SIGHUP, SIG_IGN);

  pid = fork();
  if (pid < 0) exit(EXIT_FAILURE);
  if (pid > 0) exit(EXIT_SUCCESS);

  umask(0);
  if (chdir("/") != 0) { /* best-effort, ignore error in daemon */
  }

  for (int fd = sysconf(_SC_OPEN_MAX); fd >= 3; fd--) close(fd);

  /* Redirect stdin/stdout/stderr to /dev/null so fd 0-2 stay reserved */
  int devnull = open("/dev/null", O_RDWR);
  if (devnull >= 0) {
    dup2(devnull, STDIN_FILENO);
    dup2(devnull, STDOUT_FILENO);
    dup2(devnull, STDERR_FILENO);
    if (devnull > 2) close(devnull);
  }
}

static int write_pid_file(const char* path) {
  FILE* f = fopen(path, "w");
  if (!f) return -1;
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
  setgroups(0, NULL); /* drop supplementary groups inherited from root */

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
  if (pid_file) unlink(pid_file);
}

int main(int argc, char** argv) {
  struct ttd_config cfg = {0};
  struct ttd_writer writer = {0};
  struct ttd_collector_state cst = {0};
  struct ttd_runtime rt = {0};
  int do_daemonize = 1;
  const char* config_path = NULL;

  static const struct option long_opts[] = {
      {"config", required_argument, NULL, 'c'},
      {"daemon", no_argument, NULL, 'd'},
      {"no-daemon", no_argument, NULL, 'n'},
      {"help", no_argument, NULL, 'h'},
      {NULL, 0, NULL, 0},
  };

  int opt;
  while ((opt = getopt_long(argc, argv, "dc:nh", long_opts, NULL)) != -1) {
    switch (opt) {
      case 'd':
        do_daemonize = 1;
        break;
      case 'n':
        do_daemonize = 0;
        break;
      case 'c':
        config_path = optarg;
        break;
      case 'h':
        printf(
            "Usage: tinytd [-d] [-c CONFIG]\n\n"
            "Options:\n"
            "  -d, --daemon      Run as daemon (background, default)\n"
            "  -n, --no-daemon   Run in foreground\n"
            "  -c, --config CONFIG  Path to configuration file\n"
            "                    Default: /etc/tinytrack/tinytrack.conf\n"
            "  -h, --help        Show this help and exit\n\n"
            "Signals:\n"
            "  SIGTERM/SIGINT  Graceful shutdown\n");
        return 0;
      default:
        fprintf(stderr, "Try 'tinytd --help' for usage.\n");
        return 1;
    }
  }

  if (!config_path) config_path = tt_config_file_path();

  if (ttd_config_load(config_path, &cfg) < 0) {
    fprintf(stderr, "tinytd: cannot open config file: %s\n", config_path);
    perror("");
    return 1;
  }

  /* Daemonize before tt_log_init (closes all fds) */
  if (do_daemonize) daemonize();

  /* Init sysfs paths from config (env vars TT_PROC_ROOT/TT_ROOTFS_PATH
   * take precedence over config file values if set) */
  tt_sysfs_set_proc_root(cfg.proc_root);
  tt_sysfs_set_rootfs_path(cfg.rootfs_path);
  tt_sysfs_init();

  struct tt_log_config log_cfg = {
      .backend = cfg.log_backend, .min_level = cfg.log_level, .ident = "tinytd", .async = false};
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
  cst.du_inval = cfg.du_interval_sec;

  if (ttd_runtime_init(&rt, &cfg, &cst, &writer) < 0) {
    ttd_collector_cleanup();
    ttd_writer_cleanup(&writer);
    return 1;
  }

  if (write_pid_file(cfg.pid_file) < 0)
    tt_log_warning("Failed to write pid file: %s", cfg.pid_file);

  if (getuid() == 0) {
    struct passwd* pw = getpwnam(cfg.user);
    struct group* gr = getgrnam(cfg.group);
    if (pw && gr) {
      if (chown(cfg.live_path, pw->pw_uid, gr->gr_gid) != 0)
        tt_log_warning("chown %s failed", cfg.live_path);
      if (chown(cfg.shadow_path, pw->pw_uid, gr->gr_gid) != 0)
        tt_log_warning("chown %s failed", cfg.shadow_path);
    }
    if (drop_privileges(cfg.user, cfg.group) < 0) {
      tt_log_err("Failed to drop privileges");
      cleanup(&rt, &cst, &writer, cfg.pid_file);
      return 1;
    }
    tt_log_info("Privileges dropped to %s:%s", cfg.user, cfg.group);
  }

  tt_log_info("tinytd started, interval=%u ms", cfg.interval_ms);

  while (running) ttd_runtime_poll(&rt, 1000);

  tt_log_notice("tinytd shutting down...");
  cleanup(&rt, &cst, &writer, cfg.pid_file);
  tt_log_shutdown();

  return 0;
}
