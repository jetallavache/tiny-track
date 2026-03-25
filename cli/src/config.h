#ifndef TTC_CONFIG_H
#define TTC_CONFIG_H

#include <stdbool.h>

/* CLI configuration loaded from tinytrack.conf */
struct ttc_config {
  char shm_path[256];  /* storage.live_path    */
  char pid_file[256];  /* daemon.pid_file      */
  int  interval_ms;    /* collection.interval_ms */
};

/*
 * Load relevant keys from config file into cfg.
 * CLI overrides (non-NULL) take priority over config values.
 */
void ttc_config_load(struct ttc_config *cfg, const char *config_path,
                     const char *shm_override, const char *pid_override);

#endif /* TTC_CONFIG_H */
