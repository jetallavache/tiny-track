#ifndef TT_SINK_LOG_H
#define TT_SINK_LOG_H

#include <stdarg.h>
#include <stdbool.h>

/* Уровни логирования (совместимы с syslog/systemd) */
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

/* Backend типы */
typedef enum {
  TT_LOG_BACKEND_STDERR,  /* Вывод в stderr (для CLI) */
  TT_LOG_BACKEND_STDOUT,  /* Вывод в stdout (для Docker) */
  TT_LOG_BACKEND_SYSLOG,  /* Традиционный syslog */
  TT_LOG_BACKEND_JOURNAL, /* systemd journal (приоритет для демона) */
  TT_LOG_BACKEND_AUTO     /* Автовыбор: journal → syslog → stderr */
} tt_log_backend_t;

/* Конфигурация логирования */
typedef struct {
  tt_log_backend_t backend;
  tt_log_level_t min_level; /* Минимальный уровень для вывода */
  const char* ident;        /* Идентификатор приложения */
  bool async;               /* Асинхронная запись (буферизация) */
} tt_log_config_t;

/* Инициализация системы логирования */
int tt_log_init(const tt_log_config_t* config);

/* Основная функция логирования */
void tt_log(tt_log_level_t level, const char* fmt, ...)
    __attribute__((format(printf, 2, 3)));

/* Логирование с метаданными (file, line, func) */
void tt_log_meta(tt_log_level_t level, const char* file, int line,
                 const char* func, const char* fmt, ...)
    __attribute__((format(printf, 5, 6)));

/* Структурированное логирование (для journal) */
void tt_log_structured(tt_log_level_t level, const char* message, ...);

/* Завершение работы (flush буферов) */
void tt_log_shutdown(void);

/* Макросы для удобства */
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
