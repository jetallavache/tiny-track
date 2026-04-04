#include <stdio.h>
#include <time.h>

#include "log_internal.h"

static const char* tt_log_level_str(enum tt_log_level level) {
  switch (level) {
    case TT_LOG_EMERG:
      return "EMERG";
    case TT_LOG_ALERT:
      return "ALERT";
    case TT_LOG_CRIT:
      return "CRIT";
    case TT_LOG_ERR:
      return "ERROR";
    case TT_LOG_WARNING:
      return "WARN";
    case TT_LOG_NOTICE:
      return "NOTICE";
    case TT_LOG_INFO:
      return "INFO";
    case TT_LOG_DEBUG:
      return "DEBUG";
    default:
      return "UNKNOWN";
  }
}

int tt_log_stderr_init(struct tt_log_state* state) {
  state->backend_data =
      (state->backend == TT_LOG_BACKEND_STDERR) ? (void*)stderr : (void*)stdout;
  return 0;
}

void tt_log_stderr_write(struct tt_log_state* state, enum tt_log_level level,
                         const char* file, int line, const char* func,
                         const char* fmt, va_list args) {
  FILE* out = (FILE*)state->backend_data;

  if (state->backend == TT_LOG_BACKEND_DOCKER) {
    /* Docker-friendly: no timestamp (Docker adds it via --log-opt),
     * format: "LEVEL  [ident] message"  — mirrors postgres/redis style */
    fprintf(out, "%-6s [%s] ", tt_log_level_str(level), state->ident);
  } else {
    /* stderr / stdout with timestamp */
    time_t now = time(NULL);
    struct tm tm;
    localtime_r(&now, &tm);
    fprintf(out, "[%04d-%02d-%02d %02d:%02d:%02d] [%s] [%s] ",
            tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday, tm.tm_hour, tm.tm_min,
            tm.tm_sec, state->ident, tt_log_level_str(level));
  }

  if (file && func)
    fprintf(out, "[%s:%d:%s] ", file, line, func);

  vfprintf(out, fmt, args);
  fprintf(out, "\n");
  fflush(out);
}

void tt_log_stderr_shutdown(struct tt_log_state* state) {
  FILE* out = (FILE*)state->backend_data;
  fflush(out);
}
