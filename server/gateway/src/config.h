#ifndef TTG_CONFIG_H
#define TTG_CONFIG_H

#include "common/log/log.h"

/* Gateway runtime configuration */
struct ttg_config {
  /* Daemon */
  char user[32];
  char group[32];
  char pid_file[256];
  enum tt_log_backend log_backend;
  enum tt_log_level log_level;

  /* Gateway */
  char listen[128];       /* ws://HOST:PORT or wss://HOST:PORT */
  char shm_path[256];     /* Path to live mmap file       */
  int update_interval_ms; /* Default push interval, ms    */

  /* TLS (optional — only used when listen starts with wss://) */
  char tls_cert[256]; /* PEM certificate file, or ""  */
  char tls_key[256];  /* PEM private key file, or ""  */
  char tls_ca[256];   /* PEM CA bundle, or ""         */
};

/*
 * Load [gateway] section from config file, then apply CLI overrides.
 * listen_override / shm_override may be NULL (no override).
 */
void ttg_config_load(struct ttg_config* cfg, const char* config_path,
                     const char* listen_override, const char* shm_override);

#endif /* TTG_CONFIG_H */
