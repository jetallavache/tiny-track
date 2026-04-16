#ifndef TTG_CONFIG_H
#define TTG_CONFIG_H

#include <stdint.h>

#include "common/log/log.h"

/* Gateway runtime configuration */
struct ttg_config {
  /* Daemon */
  char user[32];
  char group[32];
  char pid_file[256];
  enum tt_log_backend log_backend;
  enum tt_log_level log_level;

  /* Gateway — network (hostname + port + tls assembled into listen[]) */
  char hostname[128];     /* Bind address, e.g. "0.0.0.0" or "127.0.0.1" */
  uint16_t port;          /* Listen port, e.g. 25015                      */
  int tls;                /* 0 = ws://, 1 = wss://                        */
  char listen[256];       /* Assembled: http://HOST:PORT  (derived, not read directly) */
  char shm_path[256];     /* Path to live mmap file       */
  int update_interval_ms; /* Default push interval, ms    */

  /* TLS (optional — only used when tls = 1) */
  char tls_cert[256]; /* PEM certificate file, or ""  */
  char tls_key[256];  /* PEM private key file, or ""  */
  char tls_ca[256];   /* PEM CA bundle, or ""         */

  /* Authentication (optional — disabled when empty) */
  char auth_token[128];      /* Shared secret; empty = no auth       */
  uint32_t auth_timeout_ms;  /* Max ms to wait for CMD_AUTH (default 5000) */

  /* Safety limits */
  uint32_t max_connections;   /* Max simultaneous accepted conns (0 = 128) */
  uint32_t header_timeout_ms; /* Close if headers not received within N ms */
  uint32_t idle_timeout_ms;   /* Close idle WS conn after N ms (0 = disabled) */
  uint32_t max_uri_size;      /* Max URI length in bytes (0 = 8192) */
  uint32_t max_headers_size;  /* Max total headers size in bytes (0 = 16384) */
};

/*
 * Load [gateway] section from config file, then apply CLI overrides.
 * hostname_override / port_override / shm_override may be NULL / 0 (no override).
 */
void ttg_config_load(struct ttg_config* cfg, const char* config_path,
                     const char* hostname_override, uint16_t port_override,
                     const char* shm_override);

#endif /* TTG_CONFIG_H */
