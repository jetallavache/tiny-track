#include "ctx.h"

#include <stdlib.h>
#include <unistd.h>

#include "common/config.h"

void ttc_ctx_init(struct ttc_ctx* ctx) {
  ctx->mmap_path   = tt_config_live_path();
  ctx->config_path = tt_config_file_path();
  ctx->pid_file    = "/tmp/tinytd.pid";
  ctx->format      = FMT_TABLE;
  ctx->verbose     = false;
  ctx->color       = isatty(STDOUT_FILENO);
  ctx->interval_ms = 1000;
}
