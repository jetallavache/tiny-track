#include "s_net.h"

#include <signal.h>
#include <stdlib.h>
#include <string.h>

#include "s_printf.h"
#include "s_sock.h"
#include "s_timer.h"
#include "util.h"

size_t s_net_vprintf(struct s_conn *c, const char *fmt, va_list *ap) {
  size_t old = c->send.len;
  s_vxprintf(s_pfn_iobuf, &c->send, fmt, ap);
  return c->send.len - old;
}

size_t s_net_printf(struct s_conn *c, const char *fmt, ...) {
  size_t len = 0;
  va_list ap;
  va_start(ap, fmt);
  len = s_net_vprintf(c, fmt, &ap);
  va_end(ap);
  return len;
}

struct s_conn *s_net_alloc_conn(struct s_mgr *mgr) {
  struct s_conn *c = (struct s_conn *)calloc(1, sizeof(*c));
  if (c != NULL) {
    c->mgr = mgr;
    c->send.align = c->recv.align /* = c->rtls.align */ = S_IO_SIZE;
    c->id = ++mgr->nextid;
  }
  return c;
}

void s_net_close_conn(struct s_conn *c) {
  LIST_DELETE(struct s_conn, &c->mgr->conns, c);
  s_event_call(c, S_EVENT_CLOSE, NULL);
  L_DEBUG(("%lu %ld closed", c->id, c->fd));
  // s_tls_free(c);
  s_iobuf_free(&c->recv);
  s_iobuf_free(&c->send);
  // s_iobuf_free(&c->rtls);
  util_bzero((unsigned char *)c, sizeof(*c));
  free(c);
}

struct s_conn *s_net_connect_svc(struct s_mgr *mgr, const char *url,
                                 s_event_handler_t fn, void *fn_data,
                                 s_event_handler_t pfn, void *pfn_data) {
  struct s_conn *c = NULL;
  if (url == NULL || url[0] == '\0') {
    L_ERROR(("null url"));
  } else if ((c = s_net_alloc_conn(mgr)) == NULL) {
    L_ERROR(("OOM"));
  } else {
    LIST_ADD_HEAD(struct s_conn, &mgr->conns, c);
    // c->is_udp = (strncmp(url, "udp:", 4) == 0);
    c->fd = (void *)(size_t)S_INVALID_SOCKET;
    c->fn = fn;
    c->is_client = true;
    c->fn_data = fn_data;
    // c->is_tls = (s_url_is_ssl(url) != 0);
    c->pfn = pfn;
    c->pfn_data = pfn_data;
    s_event_call(c, S_EVENT_OPEN, (void *)url);
    L_DEBUG(("%lu %ld %s", c->id, c->fd, url));
  }
  return c;
}

struct s_conn *s_net_connect(struct s_mgr *mgr, const char *url,
                             s_event_handler_t fn, void *fn_data) {
  return s_net_connect_svc(mgr, url, fn, fn_data, NULL, NULL);
}

struct s_conn *s_net_listen(struct s_mgr *mgr, const char *url,
                            s_event_handler_t fn, void *fn_data) {
  struct s_conn *c = NULL;

  if ((c = s_net_alloc_conn(mgr)) == NULL) {
    L_ERROR(("OOM %s", url));
  } else if (!s_sock_open_listener(c, url)) {
    L_ERROR(("Failed: %s", url));
    free(c);
    c = NULL;
  } else {
    c->is_listening = 1;
    LIST_ADD_HEAD(struct s_conn, &mgr->conns, c);
    c->fn = fn;
    c->fn_data = fn_data;
    // c->is_tls = (mg_url_is_ssl(url) != 0);

    s_event_call(c, S_EVENT_OPEN, NULL);
    L_DEBUG(("%lu %ld %s", c->id, c->fd, url));
  }
  return c;
}

struct s_timer *s_net_timer_add(struct s_mgr *mgr, uint64_t ms, unsigned flags,
                                void (*fn)(void *), void *arg) {
  struct s_timer *t = (struct s_timer *)calloc(1, sizeof(*t));
  if (t != NULL) {
    flags |= S_TIMER_AUTODELETE; /* Автоматически удалять таймер */
    s_timer_init(&mgr->timers, t, ms, flags, fn, arg);
  }
  return t;
}

void s_net_mgr_init(struct s_mgr *mgr) {
  memset(mgr, 0, sizeof(*mgr));
  if ((mgr->epoll_fd = epoll_create1(EPOLL_CLOEXEC)) < 0)
    L_ERROR(("epoll_create1 errno %d", errno));
  signal(SIGPIPE, SIG_IGN);
  mgr->pipe = S_INVALID_SOCKET;
  // s_tls_ctx_init(mgr);
  m_pack_full_init(&mgr->packet);
  m_state_init(&mgr->state);
  L_DEBUG(("MG_IO_SIZE: %lu, TLS: --", S_IO_SIZE));
}

void s_net_mgr_free(struct s_mgr *mgr) {
  struct s_conn *c;
  struct s_timer *tmp, *t = mgr->timers;
  while (t != NULL) tmp = t->next, free(t), t = tmp;
  mgr->timers =
      NULL; /* Важно. Следующий звонок на опрос не будет касаться таймеров */
  for (c = mgr->conns; c != NULL; c = c->next) c->is_closing = 1;
  s_net_mgr_poll(mgr, 0);
  L_DEBUG(("All connections closed"));
  if (mgr->epoll_fd >= 0) close(mgr->epoll_fd), mgr->epoll_fd = -1;
  // mg_tls_ctx_free(mgr);
}

void s_net_mgr_poll(struct s_mgr *mgr, int ms) {
  struct s_conn *c, *tmp;
  uint64_t now;

  s_sock_iotest(mgr, ms);
  now = util_millis();

  s_timer_poll(&mgr->timers, now);

  for (c = mgr->conns; c != NULL; c = tmp) {
    bool is_resp = c->is_resp;
    tmp = c->next;
    s_event_call(c, S_EVENT_POLL, &now);
    if (is_resp && !c->is_resp) {
      long n = 0;
      s_event_call(c, S_EVENT_READ, &n);
    }

    L_VERBOSE(("%lu %c%c %c%c%c%c%c %lu", c->id, c->is_readable ? 'r' : '-',
               c->is_writable ? 'w' : '-', c->is_tls ? 'T' : 't',
               c->is_connecting ? 'C' : 'c', c->is_tls_hs ? 'H' : 'h',
               c->is_resolving ? 'R' : 'r', c->is_closing ? 'C' : 'c',
               /* c->rtls.len */ 0));

    if (c->is_resolving || c->is_closing) {
      /* Do nothing */
    } else if (c->is_listening /* && c->is_udp == 0 */) {
      if (c->is_readable) s_sock_accept_conn(mgr, c);
    } else if (c->is_connecting) {
      if (c->is_readable || c->is_writable) s_sock_connect_conn(c);
    } else {
      if (c->is_readable) s_sock_read_conn(c);
      if (c->is_writable) s_sock_write_conn(c);
      // if (c->is_tls && !c->is_tls_hs && c->send.len == 0) mg_tls_flush(c);
    }

    if (c->is_draining && c->send.len == 0) c->is_closing = 1;
    if (c->is_closing) s_sock_close_conn(c);
  }
}