#ifndef TT_TIMER_H
#define TT_TIMER_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Таймер */
struct tt_timer {
  uint64_t period_ms;      /* Период таймера в миллисекундах */
  uint64_t expire;         /* Истечение срока действия в миллисекундах */
  unsigned flags;          /* Список установленных флагов */
#define TIMER_ONCE 0       /* Вызвать функцию один раз */
#define TIMER_REPEAT 1     /* Периодический вызов */
#define TIMER_RUN_NOW 2    /* Вызов функции сразу после установки таймера */
#define TIMER_CALLED 4     /* Функция таймера была вызвана хотя бы один раз */
#define TIMER_AUTODELETE 8 /* Вызвать s_free() в конце выполнения */
  void (*fn)(void*);       /* Функция обратного вызова */
  void* arg;               /* Её аргументы */
  struct tt_timer* next;   /* Указатель на следующий экземпляр таймера */
};

void tt_timer_init(struct tt_timer** head, struct tt_timer* timer,
                   uint64_t milliseconds, unsigned flags, void (*fn)(void*),
                   void* arg);
void tt_timer_free(struct tt_timer** head, struct tt_timer*);
void tt_timer_poll(struct tt_timer** head, uint64_t new_ms);
bool tt_timer_expired(uint64_t* expiration, uint64_t period, uint64_t now);

/* System timerfd utilities (for epoll integration) */
int tt_timerfd_create(uint32_t interval_ms);

#endif /* COMMON_TIMER_H */