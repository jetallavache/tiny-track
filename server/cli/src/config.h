#ifndef TTC_CONFIG_H
#define TTC_CONFIG_H

#include <stdbool.h>
#include <stdint.h>

/* CLI configuration loaded from tinytrack.conf */
struct ttc_config {
  char shm_path[256];    /* storage.live_path      */
  char pid_file[256];    /* tinytd.pid_file        */
  char gw_pid_file[256]; /* gateway.pid_file       */
  char gw_listen[128];   /* gateway.listen         */
  int interval_ms;       /* collection.interval_ms */
  /* Ring buffer config for label computation */
  uint32_t l1_capacity;
  uint32_t l2_capacity;
  uint32_t l3_capacity;
  uint32_t l2_agg_interval_sec;
  uint32_t l3_agg_interval_sec;
  uint32_t collection_interval_ms;
};

/*
 * Load relevant keys from config file into cfg.
 * CLI overrides (non-NULL) take priority over config values.
 */
void ttc_config_load(struct ttc_config* cfg, const char* config_path,
                     const char* shm_override, const char* pid_override);

#endif /* TTC_CONFIG_H */
