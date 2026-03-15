#include "paths.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "ini.h"

/* Default paths */
#define TT_DEFAULT_LIVE_PATH "/dev/shm/tinytd-live.dat"
#define TT_DEFAULT_SHADOW_PATH "/usr/lib/tinytrack/tinytd-shadow.dat"
#define TT_DEFAULT_CONFIG_PATH "/etc/tinytrack.conf"

/* Path cache (to avoid reading config on every call) */
static const char* cached_live_path = NULL;
static const char* cached_shadow_path = NULL;

static const char* get_path_with_fallback(const char* env_var,
                                          const char* config_key,
                                          const char* default_path,
                                          const char** cache) {
  /* If already cached */
  if (*cache)
    return *cache;

  /* 1. Environment variable */
  const char* env = getenv(env_var);
  if (env) {
    *cache = env;
    return env;
  }

  /* 2. Config file */
  const char* config_file = tt_config_file_path();
  if (access(config_file, R_OK) == 0) {
    char cfg_value[256];
    if (tt_config_ini_read(config_file, config_key, cfg_value,
                           sizeof(cfg_value)) == 0) {
      *cache = strdup(cfg_value);
      return *cache;
    }
  }

  /* 3. Default */
  *cache = default_path;
  return default_path;
}

const char* tt_config_live_path(void) {
  return get_path_with_fallback("TINYTRACK_LIVE_PATH", "storage.live_mmap",
                                TT_DEFAULT_LIVE_PATH, &cached_live_path);
}

const char* tt_config_shadow_path(void) {
  return get_path_with_fallback("TINYTRACK_SHADOW_PATH", "storage.shadow_mmap",
                                TT_DEFAULT_SHADOW_PATH, &cached_shadow_path);
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
