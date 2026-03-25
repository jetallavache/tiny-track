#include "ctx.h"

#include <unistd.h>

#include "common/config.h"
#include "config.h"

void ttc_ctx_init(struct ttc_ctx* ctx) {
  ctx->config_path = tt_config_file_path();

  /* Load defaults from config file; CLI overrides applied later in main() */
  struct ttc_config cfg;
  ttc_config_load(&cfg, ctx->config_path, NULL, NULL);

  ctx->mmap_path   = tt_config_live_path(); /* overridden by cfg after strdup */
  ctx->pid_file    = tt_config_pid_path();
  ctx->format      = FMT_TABLE;
  ctx->verbose     = false;
  ctx->color       = isatty(STDOUT_FILENO);
  ctx->interval_ms = cfg.interval_ms;
}
