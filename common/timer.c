#include "timer.h"

#include <stdlib.h>
#include <sys/timerfd.h>
#include <unistd.h>

void tt_timer_init(struct tt_timer** head, struct tt_timer* t, uint64_t ms,
                   unsigned flags, void (*fn)(void*), void* arg) {
  t->period_ms = ms, t->expire = 0;
  t->flags = flags, t->fn = fn, t->arg = arg, t->next = *head;
  *head = t;
}

void tt_timer_free(struct tt_timer** head, struct tt_timer* t) {
  while (*head && *head != t)
    head = &(*head)->next;
  if (*head)
    *head = t->next;
}

/* t: expiration time, prd: period, now: current time. Return true if expired */
bool tt_timer_expired(uint64_t* t, uint64_t prd, uint64_t now) {
  if (now + prd < *t)
    *t = 0; /* Time wrapped? Reset timer */
  if (*t == 0)
    *t = now + prd; /* First poll? Set expiration */
  if (*t > now)
    return false;                               /* Not expired yet, return */
  *t = (now - *t) > prd ? now + prd : *t + prd; /* Next expiration time */
  return true;                                  /* Expired, return true */
}

void tt_timer_poll(struct tt_timer** head, uint64_t now_ms) {
  struct tt_timer *t, *tmp;
  for (t = *head; t != NULL; t = tmp) {
    bool once = t->expire == 0 && (t->flags & TIMER_RUN_NOW) &&
                !(t->flags & TIMER_CALLED); /* Handle TIMER_NOW only once */
    bool expired = tt_timer_expired(&t->expire, t->period_ms, now_ms);
    tmp = t->next;
    if (!once && !expired)
      continue;
    if ((t->flags & TIMER_REPEAT) || !(t->flags & TIMER_CALLED)) {
      t->fn(t->arg);
    }
    t->flags |= TIMER_CALLED;

    /* If this timer is not repeating and marked AUTODELETE, remove it */
    if (!(t->flags & TIMER_REPEAT) && (t->flags & TIMER_AUTODELETE)) {
      tt_timer_free(head, t);
      free(t);
    }
  }
}

int tt_timerfd_create(uint32_t interval_ms) {
  int tfd = timerfd_create(CLOCK_MONOTONIC, TFD_NONBLOCK | TFD_CLOEXEC);
  if (tfd < 0)
    return -1;

  struct itimerspec its = {
      .it_interval = {.tv_sec = interval_ms / 1000,
                      .tv_nsec = (interval_ms % 1000) * 1000000},
      .it_value = {.tv_sec = 0, .tv_nsec = 1000000}};

  if (timerfd_settime(tfd, 0, &its, NULL) < 0) {
    close(tfd);
    return -1;
  }

  return tfd;
}
