#include "paths.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "ini.h"

/* Default paths */
#define TT_DEFAULT_CONFIG_PATH "/etc/tinytrack/tinytrack.conf"

/* Path cache (to avoid reading config on every call) */
static const char* cached_live_path = NULL;
static const char* cached_shadow_path = NULL;
static const char* cached_pid_file = NULL;

static const char* get_path_from_config(const char* config_key,
                                        const char** cache) {
  if (*cache != NULL)
    return *cache;

  const char* config_file = tt_config_file_path();
  char cfg_value[256];
  if (access(config_file, R_OK) == 0 &&
      tt_config_ini_read(config_file, config_key, cfg_value,
                         sizeof(cfg_value)) == 0) {
    *cache = strdup(cfg_value);
  }

  return *cache;
}

const char* tt_config_live_path(void) {
  return get_path_from_config("storage.live_path", &cached_live_path);
}

const char* tt_config_shadow_path(void) {
  return get_path_from_config("storage.shadow_path", &cached_shadow_path);
}

const char* tt_config_pid_path(void) {
  const char* path = get_path_from_config("daemon.pid_file", &cached_pid_file);
  return path ? path : "/var/run/tinytd.pid";
}

const char* tt_config_file_path(void) {
  /* Priority: env -> ~/.tinytrack.conf -> /etc/tinytrack/tinytrack.conf */
  const char* env = getenv("TINYTRACK_CONFIG");
  if (env)
    return env;

  /* Check home directory */
  const char* home = getenv("HOME");
  if (home) {
    static char user_config[256];
    snprintf(user_config, sizeof(user_config), "%s/.tinytrack.conf", home);
    if (access(user_config, R_OK) == 0) {
      return user_config;
    }
  }

  return TT_DEFAULT_CONFIG_PATH;
}
