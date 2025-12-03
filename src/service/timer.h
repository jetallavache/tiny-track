#ifndef SRC_SERVICE_TIMER_H
#define SRC_SERVICE_TIMER_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Таймер */
struct timer {
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
  struct timer* next;      /* Указатель на следующий экземпляр таймера */
};

void timer_init(struct timer** head, struct timer* timer,
                  uint64_t milliseconds, unsigned flags, void (*fn)(void*),
                  void* arg);
void timer_free(struct timer** head, struct timer*);
void timer_poll(struct timer** head, uint64_t new_ms);
bool timer_expired(uint64_t* expiration, uint64_t period, uint64_t now);

#endif  // SRC_SERVICE_TIMER_H