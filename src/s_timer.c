#include "s_timer.h"

#include <stdlib.h>

void s_timer_init(struct s_timer **head, struct s_timer *t, uint64_t ms,
                  unsigned flags, void (*fn)(void *), void *arg) {
  t->period_ms = ms, t->expire = 0;
  t->flags = flags, t->fn = fn, t->arg = arg, t->next = *head;
  *head = t;
}

void s_timer_free(struct s_timer **head, struct s_timer *t) {
  while (*head && *head != t) head = &(*head)->next;
  if (*head) *head = t->next;
}

// t: expiration time, prd: period, now: current time. Return true if expired
bool s_timer_expired(uint64_t *t, uint64_t prd, uint64_t now) {
  if (now + prd < *t) *t = 0;                    // Time wrapped? Reset timer
  if (*t == 0) *t = now + prd;                   // Firt poll? Set expiration
  if (*t > now) return false;                    // Not expired yet, return
  *t = (now - *t) > prd ? now + prd : *t + prd;  // Next expiration time
  return true;                                   // Expired, return true
}

void s_timer_poll(struct s_timer **head, uint64_t now_ms) {
  struct s_timer *t, *tmp;
  for (t = *head; t != NULL; t = tmp) {
    bool once = t->expire == 0 && (t->flags & S_TIMER_RUN_NOW) &&
                !(t->flags & S_TIMER_CALLED);  // Handle S_TIMER_NOW only once
    bool expired = s_timer_expired(&t->expire, t->period_ms, now_ms);
    tmp = t->next;
    if (!once && !expired) continue;
    if ((t->flags & S_TIMER_REPEAT) || !(t->flags & S_TIMER_CALLED)) {
      t->fn(t->arg);
    }
    t->flags |= S_TIMER_CALLED;

    // If this timer is not repeating and marked AUTODELETE, remove it
    if (!(t->flags & S_TIMER_REPEAT) && (t->flags & S_TIMER_AUTODELETE)) {
      s_timer_free(head, t);
      free(t);
    }
  }
}
