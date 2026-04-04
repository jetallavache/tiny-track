#include "config.h"

#include <stdio.h>
#include <string.h>

#include "common/config.h"
#include "common/config/read.h"

#define DEFAULT_LISTEN "ws://0.0.0.0:4026"
#define DEFAULT_SHM_PATH "/dev/shm/tinytd-live.dat"
#define DEFAULT_INTERVAL 1000

void ttg_config_load(struct ttg_config* cfg, const char* config_path, const char* listen_override,
                     const char* shm_override) {
  if (!config_path) config_path = tt_config_file_path();

  /* [gateway] — daemon settings */
  tt_config_read_str(config_path, "gateway.user", cfg->user, sizeof(cfg->user), "tinytrack");
  tt_config_read_str(config_path, "gateway.group", cfg->group, sizeof(cfg->group), "tinytrack");
  tt_config_read_str(config_path, "gateway.pid_file", cfg->pid_file, sizeof(cfg->pid_file),
                     "/var/run/tinytrack.pid");

  char log_backend_str[32];
  if (tt_config_read_str(config_path, "gateway.log_backend", log_backend_str,
                         sizeof(log_backend_str), "auto") == 0)
    cfg->log_backend = tt_config_parse_log_backend(log_backend_str);

  char log_level_str[32];
  if (tt_config_read_str(config_path, "gateway.log_level", log_level_str, sizeof(log_level_str),
                         "info") == 0)
    cfg->log_level = tt_config_parse_log_level(log_level_str);

  /* [gateway] — network settings */
  tt_config_read_str(config_path, "gateway.listen", cfg->listen, sizeof(cfg->listen),
                     DEFAULT_LISTEN);
  tt_config_read_str(config_path, "storage.live_path", cfg->shm_path, sizeof(cfg->shm_path),
                     DEFAULT_SHM_PATH);
  cfg->update_interval_ms =
      tt_config_read_int(config_path, "gateway.update_interval", DEFAULT_INTERVAL);

  /* TLS settings (optional) */
  tt_config_read_str(config_path, "gateway.tls_cert", cfg->tls_cert, sizeof(cfg->tls_cert), "");
  tt_config_read_str(config_path, "gateway.tls_key", cfg->tls_key, sizeof(cfg->tls_key), "");
  tt_config_read_str(config_path, "gateway.tls_ca", cfg->tls_ca, sizeof(cfg->tls_ca), "");

  /* CLI overrides take priority */
  if (listen_override) snprintf(cfg->listen, sizeof(cfg->listen), "%s", listen_override);
  if (shm_override) snprintf(cfg->shm_path, sizeof(cfg->shm_path), "%s", shm_override);
}
