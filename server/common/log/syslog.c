#include <stdio.h>
#include <stdlib.h>
#include <syslog.h>

#include "log_internal.h"

bool tt_log_syslog_available(void) { return true; /* syslog is always available on POSIX */ }

int tt_log_syslog_init(struct tt_log_state* state) {
  openlog(state->ident, LOG_PID | LOG_NDELAY, LOG_DAEMON);
  return 0;
}

void tt_log_syslog_write(struct tt_log_state* state, enum tt_log_level level, const char* file,
                         int line, const char* func, const char* fmt, va_list args) {
  /* enum tt_log_level is compatible with syslog priority */
  int priority = (int)level;

  char buf[1024];
  int offset = 0;

  /* Metadata for DEBUG */
  if (file && func) {
    offset = snprintf(buf, sizeof(buf), "[%s:%d:%s] ", file, line, func);
  }

  vsnprintf(buf + offset, sizeof(buf) - offset, fmt, args);
  syslog(priority, "%s", buf);
}

void tt_log_syslog_shutdown(struct tt_log_state* state) { closelog(); }
