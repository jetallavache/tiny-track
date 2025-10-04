#include "s_event.h"

#include <stdarg.h>

#include "log.h"
#include "s_net.h"
#include "s_printf.h"

void s_event_call(struct s_conn *c, int ev, void *ev_data) {
  /* Сначала обработчик протокола, затем пользовательский обработчик */
  if (c->pfn != NULL) c->pfn(c, ev, ev_data);
  if (c->fn != NULL) c->fn(c, ev, ev_data);
}

void s_event_error(struct s_conn *c, const char *fmt, ...) {
  char buf[64];
  va_list ap;
  va_start(ap, fmt);
  s_vsnprintf(buf, sizeof(buf), fmt, &ap);
  va_end(ap);
  L_ERROR(("%lu %ld %s", c->id, c->fd, buf));
  c->is_closing = 1; /* Установите is_closing перед отправкой S_EVENT_ERROR */
  s_event_call(c, S_EVENT_ERROR,
               buf); /* Пусть обработчик пользователя переопределяет это */
}
