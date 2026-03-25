#include "config.h"

#include <stdio.h>
#include <string.h>

#include "common/config.h"
#include "common/config/read.h"

#define DEFAULT_INTERVAL 1000

void ttc_config_load(struct ttc_config *cfg, const char *config_path,
                     const char *shm_override, const char *pid_override) {
  if (!config_path)
    config_path = tt_config_file_path();

  tt_config_read_str(config_path, "storage.live_path",
                     cfg->shm_path, sizeof(cfg->shm_path),
                     tt_config_live_path());
  tt_config_read_str(config_path, "daemon.pid_file",
                     cfg->pid_file, sizeof(cfg->pid_file),
                     tt_config_pid_path());
  cfg->interval_ms = tt_config_read_int(config_path,
                     "collection.interval_ms", DEFAULT_INTERVAL);

  if (shm_override)
    snprintf(cfg->shm_path, sizeof(cfg->shm_path), "%s", shm_override);
  if (pid_override)
    snprintf(cfg->pid_file, sizeof(cfg->pid_file), "%s", pid_override);
}
