#include "event.h"

#include <stdarg.h>

#include "common/log/log.h"
#include "net.h"
#include "printf.h"

void ttg_event_call(struct ttg_conn* c, int ev, void* ev_data) {
  /* Protocol handler first, then user handler */
  if (c->pfn != NULL) c->pfn(c, ev, ev_data);
  if (c->fn != NULL) c->fn(c, ev, ev_data);
}

void ttg_event_error(struct ttg_conn* c, const char* fmt, ...) {
  char buf[64];
  va_list ap;
  va_start(ap, fmt);
  ttg_vsnprintf(buf, sizeof(buf), fmt, &ap);
  va_end(ap);
  tt_log_err("%lu %ld %s", c->id, c->fd, buf);
  c->is_closing = 1;                       /* Set is_closing before sending TTG_EVENT_ERROR */
  ttg_event_call(c, TTG_EVENT_ERROR, buf); /* Let user handler override this */
}
