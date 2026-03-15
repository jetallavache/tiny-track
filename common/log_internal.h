#ifndef TT_LOG_INTERNAL_H
#define TT_LOG_INTERNAL_H

#include <stdbool.h>

#include "log.h"

/* Internal logging state */
struct tt_log_state {
  enum tt_log_backend backend;
  enum tt_log_level min_level;
  const char* ident;
  bool initialized;
  void* backend_data; /* Backend-specific data */
};

/* Backend: stderr/stdout */
int tt_log_stderr_init(struct tt_log_state* state);
void tt_log_stderr_write(struct tt_log_state* state, enum tt_log_level level,
                         const char* file, int line, const char* func,
                         const char* fmt, va_list args);
void tt_log_stderr_shutdown(struct tt_log_state* state);

/* Backend: syslog */
bool tt_log_syslog_available(void);
int tt_log_syslog_init(struct tt_log_state* state);
void tt_log_syslog_write(struct tt_log_state* state, enum tt_log_level level,
                         const char* file, int line, const char* func,
                         const char* fmt, va_list args);
void tt_log_syslog_shutdown(struct tt_log_state* state);

/* Backend: systemd journal */
#ifdef HAVE_SYSTEMD
bool tt_log_journal_available(void);
int tt_log_journal_init(struct tt_log_state* state);
void tt_log_journal_write(struct tt_log_state* state, enum tt_log_level level,
                          const char* file, int line, const char* func,
                          const char* fmt, va_list args);
void tt_log_journal_shutdown(struct tt_log_state* state);
#endif

#endif /* TT_LOG_INTERNAL_H */
