#include "config.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "common/config.h"

void ttd_config_set_defaults(struct ttd_config* cfg) {
  /* [daemon] */
  strcpy(cfg->user, "tinytd");
  strcpy(cfg->group, "tinytd");
  strcpy(cfg->pid_file, "/tmp/tinytd.pid");
  cfg->log_level = TT_LOG_INFO;

  /* [collection] */
  cfg->interval_ms = 1000;
  cfg->du_interval_sec = 30;
  strcpy(cfg->du_path, "/tmp");

  /* [storage] */
  /* Use paths from config system */
  strncpy(cfg->live_path, tt_config_live_path(), sizeof(cfg->live_path) - 1);
  strncpy(cfg->shadow_path, tt_config_shadow_path(),
          sizeof(cfg->shadow_path) - 1);
  cfg->shadow_sync_interval_sec = 5;
  cfg->file_mode = 0644; /* rw-r--r-- - readable by all */

  /* [ringbuffer] */
  cfg->l1_capacity = 60;
  cfg->l2_capacity = 60;
  cfg->l2_aggregate_interval = 60;
  cfg->l3_capacity = 24;
  cfg->l3_aggregate_interval = 3600;

  /* [recovery] */
  cfg->enable_crc = true;
  cfg->auto_recover = true;

  /* [gateway] */
}

int ttd_config_load(const char* path, struct ttd_config* cfg) {
  /* Set defaults */
  ttd_config_set_defaults(cfg);

  /* If no path given, use system default */
  if (!path) {
    path = tt_config_file_path();
  }

  /* Try to open the file */
  FILE* f = fopen(path, "r");
  if (!f) {
    /* File not found - use defaults */
    return 0;
  }
  fclose(f);

  /* [daemon] */
  tt_config_read_str(path, "daemon.user", cfg->user, sizeof(cfg->user),
                     "tinytd");
  tt_config_read_str(path, "daemon.group", cfg->group, sizeof(cfg->group),
                     "tinytd");
  tt_config_read_str(path, "daemon.pid_file", cfg->pid_file,
                     sizeof(cfg->pid_file), "/var/run/tinytd.pid");
  char log_level_str[32];
  if (tt_config_read_str(path, "daemon.log_level", log_level_str,
                         sizeof(log_level_str), "debug") == 0) {
    cfg->log_level = tt_config_parse_log_level(log_level_str);
  }

  /* [collection] */
  cfg->interval_ms = tt_config_read_int(path, "collection.interval_ms", 1000);
  cfg->du_interval_sec =
      tt_config_read_int(path, "collection.du_interval_sec", 30);
  tt_config_read_str(path, "collection.du_path", cfg->du_path,
                     sizeof(cfg->du_path), "/home");

  /* [storage] */
  tt_config_read_str(path, "storage.live_path", cfg->live_path,
                     sizeof(cfg->live_path), "/tmp/tinytd-live.dat");
  tt_config_read_str(path, "storage.shadow_path", cfg->shadow_path,
                     sizeof(cfg->shadow_path), "/tmp/tinytd-shadow.dat");
  cfg->shadow_sync_interval_sec =
      tt_config_read_int(path, "storage.shadow_sync_interval_sec", 60);
  cfg->file_mode = tt_config_read_int(path, "storage.file_mode", 0644);

  /* [ringbuffer] */
  cfg->l1_capacity = tt_config_read_int(path, "ringbuffer.l1_capacity", 3600);
  cfg->l2_capacity = tt_config_read_int(path, "ringbuffer.l2_capacity", 1440);
  cfg->l3_capacity = tt_config_read_int(path, "ringbuffer.l3_capacity", 168);
  cfg->l2_aggregate_interval =
      tt_config_read_int(path, "ringbuffer.l2_aggregate_interval", 60);
  cfg->l3_aggregate_interval =
      tt_config_read_int(path, "ringbuffer.l3_aggregate_interval", 3600);

  /* [recovery] */
  cfg->enable_crc = tt_config_read_bool(path, "recovery.enable_crc", true);
  cfg->auto_recover = tt_config_read_bool(path, "recovery.auto_recover", true);

  return 0;
}
