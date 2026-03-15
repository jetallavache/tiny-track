#ifndef TT_SINK_LOG_H
#define TT_SINK_LOG_H

#include <stdarg.h>
#include <stdbool.h>

/* Log levels (compatible with syslog/systemd) */
typedef enum {
  TT_LOG_EMERG = 0,
  TT_LOG_ALERT = 1,
  TT_LOG_CRIT = 2,
  TT_LOG_ERR = 3,
  TT_LOG_WARNING = 4,
  TT_LOG_NOTICE = 5,
  TT_LOG_INFO = 6,
  TT_LOG_DEBUG = 7
} tt_log_level_t;

/* Backend types */
typedef enum {
  TT_LOG_BACKEND_STDERR,  /* Output to stderr (for CLI) */
  TT_LOG_BACKEND_STDOUT,  /* Output to stdout (for Docker) */
  TT_LOG_BACKEND_SYSLOG,  /* Traditional syslog */
  TT_LOG_BACKEND_JOURNAL, /* systemd journal (preferred for daemon) */
  TT_LOG_BACKEND_AUTO     /* Auto-select: journal -> syslog -> stderr */
} tt_log_backend_t;

/* Logging configuration */
typedef struct {
  tt_log_backend_t backend;
  tt_log_level_t min_level; /* Minimum level for output */
  const char* ident;        /* Application identifier */
  bool async;               /* Async write (buffering) */
} tt_log_config_t;

/* Initialize logging system */
int tt_log_init(const tt_log_config_t* config);

/* Main logging function */
void tt_log(tt_log_level_t level, const char* fmt, ...)
    __attribute__((format(printf, 2, 3)));

/* Logging with metadata (file, line, func) */
void tt_log_meta(tt_log_level_t level, const char* file, int line,
                 const char* func, const char* fmt, ...)
    __attribute__((format(printf, 5, 6)));

/* Structured logging (for journal) */
void tt_log_structured(tt_log_level_t level, const char* message, ...);

/* Shutdown (flush buffers) */
void tt_log_shutdown(void);

/* Convenience macros */
#define tt_log_emerg(...) tt_log(TT_LOG_EMERG, __VA_ARGS__)
#define tt_log_alert(...) tt_log(TT_LOG_ALERT, __VA_ARGS__)
#define tt_log_crit(...) tt_log(TT_LOG_CRIT, __VA_ARGS__)
#define tt_log_err(...) tt_log(TT_LOG_ERR, __VA_ARGS__)
#define tt_log_warning(...) tt_log(TT_LOG_WARNING, __VA_ARGS__)
#define tt_log_notice(...) tt_log(TT_LOG_NOTICE, __VA_ARGS__)
#define tt_log_info(...) tt_log(TT_LOG_INFO, __VA_ARGS__)

#ifdef NDEBUG
#define tt_log_debug(...) ((void)0)
#else
#define tt_log_debug(...) \
  tt_log_meta(TT_LOG_DEBUG, __FILE__, __LINE__, __func__, __VA_ARGS__)
#endif

#endif /* TT_SINK_LOG_H */
