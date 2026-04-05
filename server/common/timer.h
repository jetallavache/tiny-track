#ifndef TT_TIMER_H
#define TT_TIMER_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Timer */
struct tt_timer {
  uint64_t period_ms;      /* Timer period in milliseconds */
  uint64_t expire;         /* Expiration time in milliseconds */
  unsigned flags;          /* Set of active flags */
#define TIMER_ONCE 0       /* Call function once */
#define TIMER_REPEAT 1     /* Periodic call */
#define TIMER_RUN_NOW 2    /* Call function immediately after timer is set */
#define TIMER_CALLED 4     /* Timer function has been called at least once */
#define TIMER_AUTODELETE 8 /* Call s_free() at the end of execution */
  void (*fn)(void*);       /* Callback function */
  void* arg;               /* Its arguments */
  struct tt_timer* next;   /* Pointer to the next timer instance */
};

void tt_timer_init(struct tt_timer** head, struct tt_timer* timer, uint64_t milliseconds,
                   unsigned flags, void (*fn)(void*), void* arg);
void tt_timer_free(struct tt_timer** head, struct tt_timer*);
void tt_timer_poll(struct tt_timer** head, uint64_t new_ms);
bool tt_timer_expired(uint64_t* expiration, uint64_t period, uint64_t now);

/* System timerfd utilities (for epoll integration) */
int tt_timerfd_create(uint32_t interval_ms);

#endif /* TT_TIMER_H */