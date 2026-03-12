#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "log.h"
#include "log_internal.h"

static tt_log_state_t g_log_state = {.backend = TT_LOG_BACKEND_STDERR,
                                     .min_level = TT_LOG_INFO,
                                     .initialized = false};

int tt_log_init(const tt_log_config_t* config) {
  if (g_log_state.initialized) {
    tt_log_shutdown();
  }

  g_log_state.min_level = config->min_level;
  g_log_state.ident =
      config->ident ? strdup(config->ident) : strdup("tinytrack");

  tt_log_backend_t backend = config->backend;

  /* Автовыбор backend */
  if (backend == TT_LOG_BACKEND_AUTO) {
#ifdef HAVE_SYSTEMD
    if (tt_log_journal_available()) {
      backend = TT_LOG_BACKEND_JOURNAL;
    } else
#endif
        if (tt_log_syslog_available()) {
      backend = TT_LOG_BACKEND_SYSLOG;
    } else {
      backend = TT_LOG_BACKEND_STDERR;
    }
  }

  g_log_state.backend = backend;

  /* Инициализация выбранного backend */
  switch (backend) {
#ifdef HAVE_SYSTEMD
    case TT_LOG_BACKEND_JOURNAL:
      if (tt_log_journal_init(&g_log_state) != 0) {
        return -1;
      }
      break;
#endif
    case TT_LOG_BACKEND_SYSLOG:
      if (tt_log_syslog_init(&g_log_state) != 0) {
        return -1;
      }
      break;
    case TT_LOG_BACKEND_STDERR:
    case TT_LOG_BACKEND_STDOUT:
      if (tt_log_stderr_init(&g_log_state) != 0) {
        return -1;
      }
      break;
    default:
      return -1;
  }

  g_log_state.initialized = true;
  return 0;
}

void tt_log(tt_log_level_t level, const char* fmt, ...) {
  if (!g_log_state.initialized || level > g_log_state.min_level) {
    return;
  }

  va_list args;
  va_start(args, fmt);

  switch (g_log_state.backend) {
#ifdef HAVE_SYSTEMD
    case TT_LOG_BACKEND_JOURNAL:
      tt_log_journal_write(&g_log_state, level, NULL, 0, NULL, fmt, args);
      break;
#endif
    case TT_LOG_BACKEND_SYSLOG:
      tt_log_syslog_write(&g_log_state, level, NULL, 0, NULL, fmt, args);
      break;
    case TT_LOG_BACKEND_STDERR:
    case TT_LOG_BACKEND_STDOUT:
      tt_log_stderr_write(&g_log_state, level, NULL, 0, NULL, fmt, args);
      break;
  }

  va_end(args);
}

void tt_log_meta(tt_log_level_t level, const char* file, int line,
                 const char* func, const char* fmt, ...) {
  if (!g_log_state.initialized || level > g_log_state.min_level) {
    return;
  }

  va_list args;
  va_start(args, fmt);

  switch (g_log_state.backend) {
#ifdef HAVE_SYSTEMD
    case TT_LOG_BACKEND_JOURNAL:
      tt_log_journal_write(&g_log_state, level, file, line, func, fmt, args);
      break;
#endif
    case TT_LOG_BACKEND_SYSLOG:
      tt_log_syslog_write(&g_log_state, level, file, line, func, fmt, args);
      break;
    case TT_LOG_BACKEND_STDERR:
    case TT_LOG_BACKEND_STDOUT:
      tt_log_stderr_write(&g_log_state, level, file, line, func, fmt, args);
      break;
  }

  va_end(args);
}

void tt_log_shutdown(void) {
  if (!g_log_state.initialized) {
    return;
  }

  switch (g_log_state.backend) {
#ifdef HAVE_SYSTEMD
    case TT_LOG_BACKEND_JOURNAL:
      tt_log_journal_shutdown(&g_log_state);
      break;
#endif
    case TT_LOG_BACKEND_SYSLOG:
      tt_log_syslog_shutdown(&g_log_state);
      break;
    case TT_LOG_BACKEND_STDERR:
    case TT_LOG_BACKEND_STDOUT:
      tt_log_stderr_shutdown(&g_log_state);
      break;
  }

  free((void*)g_log_state.ident);
  g_log_state.initialized = false;
}
