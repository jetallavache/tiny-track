#include <getopt.h>
#include <signal.h>
#include <stdio.h>

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

int main(int argc, char **argv) {
  const char *config_path = NULL;
  const char *listen_override = NULL;
  const char *shm_override = NULL;
  static char listen_buf[64];

  static const struct option long_opts[] = {
      {"config", required_argument, NULL, 'c'},
      {"port",   required_argument, NULL, 'p'},
      {"listen", required_argument, NULL, 'l'},
      {"shm",    required_argument, NULL, 's'},
      {"help",   no_argument,       NULL, 'h'},
      {NULL, 0, NULL, 0},
  };

  int opt;
  while ((opt = getopt_long(argc, argv, "c:p:l:s:h", long_opts, NULL)) != -1) {
    switch (opt) {
      case 'c': config_path     = optarg; break;
      case 'l': listen_override = optarg; break;
      case 's': shm_override    = optarg; break;
      case 'p':
        snprintf(listen_buf, sizeof(listen_buf), "ws://0.0.0.0:%s", optarg);
        listen_override = listen_buf;
        break;
      case 'h':
        printf("Usage: tinytrack [-c CONFIG] [-p PORT] "
               "[-l ws://HOST:PORT] [-s SHM_PATH]\n");
        return 0;
      default:
        fprintf(stderr, "Usage: tinytrack [-c CONFIG] [-p PORT] "
                "[-l ws://HOST:PORT] [-s SHM_PATH]\n");
        return 1;
    }
  }

  struct ttg_config cfg;
  ttg_config_load(&cfg, config_path, listen_override, shm_override);

  struct tt_log_config log_cfg = {
      .backend   = TT_LOG_BACKEND_STDERR,
      .min_level = TT_LOG_DEBUG,
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
  tt_log_notice("tinytrack gateway shutting down...");

  return 0;
}
