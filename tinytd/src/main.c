#include <signal.h>
#include <stdio.h>
#include <stdlib.h>

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

int main(int argc, char** argv) {
  struct ttd_config cfg;
  struct ttd_writer writer = {0};
  struct ttd_state collector_state = {0};
  struct ttd_runtime rt = {0};

  /* Load config */
  const char* config_path = tt_config_file_path();
  if (argc > 1)
    config_path = argv[1];
  if (ttd_config_load(config_path, &cfg) < 0) {
    ttd_config_set_defaults(&cfg);
  }

  /* Setup logging */
  tt_log_config_t log_cfg = {.backend = TT_LOG_BACKEND_STDOUT,
                             .min_level = cfg.log_level,
                             .ident = "tinytd",
                             .async = false};
  tt_log_init(&log_cfg);
  tt_log_notice("tinytd starting...");

  /* Debug info */
  char cwd[256];
  getcwd(cwd, sizeof(cwd));
  tt_log_info("cwd=%s, uid=%d, gid=%d", cwd, getuid(), getgid());
  tt_log_info("live_path=%s, shadow_path=%s", cfg.live_path, cfg.shadow_path);

  /* Debug environment */
  const char* env_live = getenv("TINYTRACK_LIVE_PATH");
  const char* env_shadow = getenv("TINYTRACK_SHADOW_PATH");
  tt_log_info("ENV: TINYTRACK_LIVE_PATH=%s", env_live ? env_live : "(not set)");
  tt_log_info("ENV: TINYTRACK_SHADOW_PATH=%s",
              env_shadow ? env_shadow : "(not set)");

  /* Clean up old files if they exist (for debugging) */
  unlink(cfg.live_path);
  unlink(cfg.shadow_path);

  /* Initialize writer */
  if (ttd_writer_init(&writer, &cfg) < 0) {
    tt_log_err("Failed to initialize writer");
    return 1;
  }

  /* Setup signal handlers */
  signal(SIGTERM, signal_handler);
  signal(SIGINT, signal_handler);

  /* Initialize collector */
  ttd_collector_init();
  collector_state.du_path = cfg.du_path;
  collector_state.du_inval = cfg.du_interval_sec;

  /* Initialize runtime */
  if (ttd_runtime_init(&rt, &cfg, &collector_state, &writer) < 0) {
    ttd_collector_cleanup();
    ttd_writer_cleanup(&writer);
    return 1;
  }

  tt_log_info("Runtime initialized: rt=%p, writer=%p", (void*)&rt,
              (void*)&writer);
  tt_log_info("tinytd started, collecting metrics every %u ms",
              cfg.interval_ms);

  /* Main loop */
  while (running) {
    ttd_runtime_poll(&rt, 1000);
  }

  /* Cleanup */
  tt_log_notice("tinytd shutting down...");
  ttd_runtime_free(&rt);
  ttd_collector_cleanup();
  ttd_writer_cleanup(&writer);
  tt_log_shutdown();

  return 0;
}
