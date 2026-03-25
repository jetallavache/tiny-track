#ifndef TTG_CONFIG_H
#define TTG_CONFIG_H

/* Gateway runtime configuration */
struct ttg_config {
  char listen[128];        /* ws://HOST:PORT               */
  char shm_path[256];      /* Path to live mmap file       */
  int  update_interval_ms; /* Default push interval, ms    */
};

/*
 * Load [gateway] section from config file, then apply CLI overrides.
 * listen_override / shm_override may be NULL (no override).
 */
void ttg_config_load(struct ttg_config *cfg, const char *config_path,
                     const char *listen_override, const char *shm_override);

#endif /* TTG_CONFIG_H */
