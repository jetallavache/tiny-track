#include "read.h"

#include <stdlib.h>
#include <string.h>
#include <strings.h>

#include "ini.h"

int tt_config_read_int(const char* filepath, const char* key, int default_val) {
  char buf[32];
  if (tt_config_ini_read(filepath, key, buf, sizeof(buf)) != 0) {
    return default_val;
  }
  /* Support octal (0644), hex (0x1A4), and decimal */
  return (int)strtol(buf, NULL, 0);
}

bool tt_config_read_bool(const char* filepath, const char* key, bool default_val) {
  char buf[32];
  if (tt_config_ini_read(filepath, key, buf, sizeof(buf)) != 0) {
    return default_val;
  }

  /* Support various formats */
  if (strcasecmp(buf, "true") == 0 || strcasecmp(buf, "yes") == 0 || strcasecmp(buf, "on") == 0 ||
      strcmp(buf, "1") == 0) {
    return true;
  }

  if (strcasecmp(buf, "false") == 0 || strcasecmp(buf, "no") == 0 || strcasecmp(buf, "off") == 0 ||
      strcmp(buf, "0") == 0) {
    return false;
  }

  return default_val;
}

int tt_config_read_str(const char* filepath, const char* key, char* buf, size_t bufsize,
                       const char* default_val) {
  if (tt_config_ini_read(filepath, key, buf, bufsize) != 0) {
    if (default_val) {
      strncpy(buf, default_val, bufsize - 1);
      buf[bufsize - 1] = '\0';
    } else {
      buf[0] = '\0';
    }
    return -1;
  }
  return 0;
}

enum tt_log_backend tt_config_parse_log_backend(const char* backend_str) {
  if (!backend_str) return TT_LOG_BACKEND_AUTO;

  if (strcasecmp(backend_str, "stderr") == 0) return TT_LOG_BACKEND_STDERR;
  if (strcasecmp(backend_str, "stdout") == 0) return TT_LOG_BACKEND_STDOUT;
  if (strcasecmp(backend_str, "docker") == 0) return TT_LOG_BACKEND_DOCKER;
  if (strcasecmp(backend_str, "syslog") == 0) return TT_LOG_BACKEND_SYSLOG;
  if (strcasecmp(backend_str, "journal") == 0) return TT_LOG_BACKEND_JOURNAL;
  if (strcasecmp(backend_str, "auto") == 0) return TT_LOG_BACKEND_AUTO;

  /* Try as a number */
  int backend = atoi(backend_str);
  if (backend >= TT_LOG_BACKEND_STDERR && backend <= TT_LOG_BACKEND_AUTO) {
    return (enum tt_log_backend)backend;
  }

  return TT_LOG_BACKEND_AUTO; /* default */
}

enum tt_log_level tt_config_parse_log_level(const char* level_str) {
  if (!level_str) return TT_LOG_INFO;

  if (strcasecmp(level_str, "emerg") == 0) return TT_LOG_EMERG;
  if (strcasecmp(level_str, "alert") == 0) return TT_LOG_ALERT;
  if (strcasecmp(level_str, "crit") == 0) return TT_LOG_CRIT;
  if (strcasecmp(level_str, "err") == 0 || strcasecmp(level_str, "error") == 0) return TT_LOG_ERR;
  if (strcasecmp(level_str, "warning") == 0 || strcasecmp(level_str, "warn") == 0)
    return TT_LOG_WARNING;
  if (strcasecmp(level_str, "notice") == 0) return TT_LOG_NOTICE;
  if (strcasecmp(level_str, "info") == 0) return TT_LOG_INFO;
  if (strcasecmp(level_str, "debug") == 0) return TT_LOG_DEBUG;

  /* Try as a number */
  int level = atoi(level_str);
  if (level >= TT_LOG_EMERG && level <= TT_LOG_DEBUG) {
    return (enum tt_log_level)level;
  }

  return TT_LOG_INFO; /* default */
}
