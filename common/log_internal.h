#ifndef TT_LOG_INTERNAL_H
#define TT_LOG_INTERNAL_H

#include <stdbool.h>

#include "log.h"

/* Internal logging state */
typedef struct {
  tt_log_backend_t backend;
  tt_log_level_t min_level;
  const char* ident;
  bool initialized;
  void* backend_data; /* Backend-specific data */
} tt_log_state_t;

/* Backend: stderr/stdout */
int tt_log_stderr_init(tt_log_state_t* state);
void tt_log_stderr_write(tt_log_state_t* state, tt_log_level_t level,
                         const char* file, int line, const char* func,
                         const char* fmt, va_list args);
void tt_log_stderr_shutdown(tt_log_state_t* state);

/* Backend: syslog */
bool tt_log_syslog_available(void);
int tt_log_syslog_init(tt_log_state_t* state);
void tt_log_syslog_write(tt_log_state_t* state, tt_log_level_t level,
                         const char* file, int line, const char* func,
                         const char* fmt, va_list args);
void tt_log_syslog_shutdown(tt_log_state_t* state);

/* Backend: systemd journal */
#ifdef HAVE_SYSTEMD
bool tt_log_journal_available(void);
int tt_log_journal_init(tt_log_state_t* state);
void tt_log_journal_write(tt_log_state_t* state, tt_log_level_t level,
                          const char* file, int line, const char* func,
                          const char* fmt, va_list args);
void tt_log_journal_shutdown(tt_log_state_t* state);
#endif

#endif /* TT_LOG_INTERNAL_H */
