#ifndef SRC_SERVICE_TIMER_H
#define SRC_SERVICE_TIMER_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Таймер */
struct s_timer {
  uint64_t period_ms;        /* Период таймера в миллисекундах */
  uint64_t expire;           /* Истечение срока действия в миллисекундах */
  unsigned flags;            /* Список установленных флагов */
#define S_TIMER_ONCE 0       /* Вызвать функцию один раз */
#define S_TIMER_REPEAT 1     /* Периодический вызов */
#define S_TIMER_RUN_NOW 2    /* Вызов функции сразу после установки таймера */
#define S_TIMER_CALLED 4     /* Функция таймера была вызвана хотя бы один раз */
#define S_TIMER_AUTODELETE 8 /* Вызвать s_free() в конце выполнения */
  void (*fn)(void*);         /* Функция обратного вызова */
  void* arg;                 /* Её аргументы */
  struct s_timer* next;      /* Указатель на следующий экземпляр таймера */
};

void s_timer_init(struct s_timer** head, struct s_timer* timer,
                  uint64_t milliseconds, unsigned flags, void (*fn)(void*),
                  void* arg);
void s_timer_free(struct s_timer** head, struct s_timer*);
void s_timer_poll(struct s_timer** head, uint64_t new_ms);
bool s_timer_expired(uint64_t* expiration, uint64_t period, uint64_t now);

#endif  // SRC_SERVICE_TIMER_H