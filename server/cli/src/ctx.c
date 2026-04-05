#include "ctx.h"

#include <unistd.h>

#include "common/config.h"
#include "config.h"

void ttc_ctx_init(struct ttc_ctx* ctx) {
  ctx->config_path = tt_config_file_path();

  ttc_config_load(&ctx->cfg, ctx->config_path, NULL, NULL);

  ctx->mmap_path = ctx->cfg.shm_path;
  ctx->pid_file = ctx->cfg.pid_file;
  ctx->gw_pid_file = ctx->cfg.gw_pid_file;
  ctx->gw_listen = ctx->cfg.gw_listen;
  ctx->format = FMT_TABLE;
  ctx->verbose = false;
  ctx->color = isatty(STDOUT_FILENO);
  ctx->interval_ms = ctx->cfg.interval_ms;
}
