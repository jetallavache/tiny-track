#include "config.h"

#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "common/config.h"
#include "common/config/read.h"

#define DEFAULT_INTERVAL 1000

void ttc_config_load(struct ttc_config* cfg, const char* config_path,
                     const char* shm_override, const char* pid_override) {
  if (!config_path)
    config_path = tt_config_file_path();

  tt_config_read_str(config_path, "storage.live_path", cfg->shm_path,
                     sizeof(cfg->shm_path), tt_config_live_path());
  tt_config_read_str(config_path, "tinytd.pid_file", cfg->pid_file,
                     sizeof(cfg->pid_file), "/var/run/tinytd.pid");
  tt_config_read_str(config_path, "gateway.pid_file", cfg->gw_pid_file,
                     sizeof(cfg->gw_pid_file), "/var/run/tinytrack.pid");
  tt_config_read_str(config_path, "gateway.listen", cfg->gw_listen,
                     sizeof(cfg->gw_listen), "ws://0.0.0.0:4026");

  cfg->interval_ms = tt_config_read_int(config_path, "collection.interval_ms",
                                        DEFAULT_INTERVAL);

  /* Ring buffer config for label computation */
  cfg->collection_interval_ms = (uint32_t)cfg->interval_ms;
  cfg->l1_capacity =
      (uint32_t)tt_config_read_int(config_path, "ringbuffer.l1_capacity", 3600);
  cfg->l2_capacity =
      (uint32_t)tt_config_read_int(config_path, "ringbuffer.l2_capacity", 1440);
  cfg->l3_capacity =
      (uint32_t)tt_config_read_int(config_path, "ringbuffer.l3_capacity", 720);
  cfg->l2_agg_interval_sec = (uint32_t)tt_config_read_int(
      config_path, "ringbuffer.l2_aggregate_interval", 60);
  cfg->l3_agg_interval_sec = (uint32_t)tt_config_read_int(
      config_path, "ringbuffer.l3_aggregate_interval", 3600);

  if (shm_override)
    snprintf(cfg->shm_path, sizeof(cfg->shm_path), "%s", shm_override);
  if (pid_override)
    snprintf(cfg->pid_file, sizeof(cfg->pid_file), "%s", pid_override);
}
