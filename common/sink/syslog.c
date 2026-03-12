#include <stdio.h>
#include <stdlib.h>
#include <syslog.h>

#include "log_internal.h"

bool tt_log_syslog_available(void) {
  return true; /* syslog всегда доступен на POSIX */
}

int tt_log_syslog_init(tt_log_state_t* state) {
  openlog(state->ident, LOG_PID | LOG_NDELAY, LOG_DAEMON);
  return 0;
}

void tt_log_syslog_write(tt_log_state_t* state, tt_log_level_t level,
                         const char* file, int line, const char* func,
                         const char* fmt, va_list args) {
  /* tt_log_level_t совместим с syslog priority */
  int priority = (int)level;

  char buf[1024];
  int offset = 0;

  /* Метаданные для DEBUG */
  if (file && func) {
    offset = snprintf(buf, sizeof(buf), "[%s:%d:%s] ", file, line, func);
  }

  vsnprintf(buf + offset, sizeof(buf) - offset, fmt, args);
  syslog(priority, "%s", buf);
}

void tt_log_syslog_shutdown(tt_log_state_t* state) {
  closelog();
}
