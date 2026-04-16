#include "config.h"

#include <stdio.h>
#include <string.h>

#include "common/config.h"
#include "common/config/read.h"

#define DEFAULT_HOSTNAME "0.0.0.0"
#define DEFAULT_PORT     25015
#define DEFAULT_SHM_PATH "/dev/shm/tinytd-live.dat"
#define DEFAULT_INTERVAL 1000

/* Assemble cfg->listen from cfg->hostname, cfg->port, cfg->tls */
static void build_listen(struct ttg_config* cfg) {
  snprintf(cfg->listen, sizeof(cfg->listen), "%s://%s:%u",
           cfg->tls ? "https" : "http", cfg->hostname, (unsigned)cfg->port);
}

void ttg_config_load(struct ttg_config* cfg, const char* config_path,
                     const char* hostname_override, uint16_t port_override,
                     const char* shm_override) {
  if (!config_path)
    config_path = tt_config_file_path();

  /* [gateway] — daemon settings */
  tt_config_read_str(config_path, "gateway.user", cfg->user, sizeof(cfg->user),
                     "tinytrack");
  tt_config_read_str(config_path, "gateway.group", cfg->group,
                     sizeof(cfg->group), "tinytrack");
  tt_config_read_str(config_path, "gateway.pid_file", cfg->pid_file,
                     sizeof(cfg->pid_file), "/var/run/tinytrack.pid");

  char log_backend_str[32];
  if (tt_config_read_str(config_path, "gateway.log_backend", log_backend_str,
                         sizeof(log_backend_str), "auto") == 0)
    cfg->log_backend = tt_config_parse_log_backend(log_backend_str);

  char log_level_str[32];
  if (tt_config_read_str(config_path, "gateway.log_level", log_level_str,
                         sizeof(log_level_str), "info") == 0)
    cfg->log_level = tt_config_parse_log_level(log_level_str);

  /* [gateway] — network: hostname + port + tls */
  tt_config_read_str(config_path, "gateway.hostname", cfg->hostname,
                     sizeof(cfg->hostname), DEFAULT_HOSTNAME);
  cfg->port = (uint16_t)tt_config_read_int(config_path, "gateway.port",
                                           DEFAULT_PORT);
  cfg->tls = tt_config_read_int(config_path, "gateway.tls", 0);

  tt_config_read_str(config_path, "storage.live_path", cfg->shm_path,
                     sizeof(cfg->shm_path), DEFAULT_SHM_PATH);
  cfg->update_interval_ms = tt_config_read_int(
      config_path, "gateway.update_interval", DEFAULT_INTERVAL);

  /* TLS settings (optional) */
  tt_config_read_str(config_path, "gateway.tls_cert", cfg->tls_cert,
                     sizeof(cfg->tls_cert), "");
  tt_config_read_str(config_path, "gateway.tls_key", cfg->tls_key,
                     sizeof(cfg->tls_key), "");
  tt_config_read_str(config_path, "gateway.tls_ca", cfg->tls_ca,
                     sizeof(cfg->tls_ca), "");

  /* Authentication (optional) */
  tt_config_read_str(config_path, "gateway.auth_token", cfg->auth_token,
                     sizeof(cfg->auth_token), "");
  cfg->auth_timeout_ms =
      (uint32_t)tt_config_read_int(config_path, "gateway.auth_timeout_ms", 5000);

  /* CLI overrides take priority */
  if (hostname_override)
    snprintf(cfg->hostname, sizeof(cfg->hostname), "%s", hostname_override);
  if (port_override)
    cfg->port = port_override;
  if (shm_override)
    snprintf(cfg->shm_path, sizeof(cfg->shm_path), "%s", shm_override);

  /* Assemble listen URL from parts */
  build_listen(cfg);

  /* Safety limits */
  cfg->max_connections =
      (uint32_t)tt_config_read_int(config_path, "gateway.max_connections", 128);
  cfg->header_timeout_ms =
      (uint32_t)tt_config_read_int(config_path, "gateway.header_timeout_ms", 5000);
  cfg->idle_timeout_ms =
      (uint32_t)tt_config_read_int(config_path, "gateway.idle_timeout_ms", 0);
  cfg->max_uri_size =
      (uint32_t)tt_config_read_int(config_path, "gateway.max_uri_size", 8192);
  cfg->max_headers_size =
      (uint32_t)tt_config_read_int(config_path, "gateway.max_headers_size", 16384);
}
