#include "net.h"

#include <signal.h>
#include <stdlib.h>
#include <string.h>

#include "printf.h"
#include "sock.h"
#include "tls.h"
#include "util.h"

size_t ttg_net_vprintf(struct ttg_conn* c, const char* fmt, va_list* ap) {
  size_t old = c->send.len;
  ttg_vxprintf(ttg_pfn_iobuf, &c->send, fmt, ap);
  return c->send.len - old;
}

size_t ttg_net_printf(struct ttg_conn* c, const char* fmt, ...) {
  size_t len = 0;
  va_list ap;
  va_start(ap, fmt);
  len = ttg_net_vprintf(c, fmt, &ap);
  va_end(ap);
  return len;
}

struct ttg_conn* ttg_net_alloc_conn(struct ttg_mgr* mgr) {
  struct ttg_conn* c = (struct ttg_conn*)calloc(1, sizeof(*c));
  if (c != NULL) {
    c->mgr = mgr;
    c->send.align = c->recv.align /* = c->rtls.align */ = TTG_IO_SIZE;
    c->id = ++mgr->nextid;
  }
  return c;
}

void ttg_net_close_conn(struct ttg_conn* c) {
  LIST_DELETE(struct ttg_conn, &c->mgr->conns, c);
  ttg_event_call(c, TTG_EVENT_CLOSE, NULL);
  tt_log_debug("%lu %ld closed", c->id, c->fd);
  ttg_tls_free(c);
  ttg_iobuf_free(&c->recv);
  ttg_iobuf_free(&c->send);
  ttg_util_bzero((unsigned char*)c, sizeof(*c));
  free(c);
}

struct ttg_conn* ttg_net_connect_svc(struct ttg_mgr* mgr, const char* url,
                                     ttg_event_handler fn, void* fn_data,
                                     ttg_event_handler pfn, void* pfn_data) {
  struct ttg_conn* c = NULL;
  if (url == NULL || url[0] == '\0') {
    tt_log_err("null url");
  } else if ((c = ttg_net_alloc_conn(mgr)) == NULL) {
    tt_log_err("OOM");
  } else {
    LIST_ADD_HEAD(struct ttg_conn, &mgr->conns, c);
    /* c->is_udp = (strncmp(url, "udp:", 4) == 0); */
    c->fd = (void*)(size_t)TTG_INVALID_SOCKET;
    c->fn = fn;
    c->is_client = true;
    c->fn_data = fn_data;
    c->is_tls = (ttg_url_is_ssl(url) != 0);
    c->pfn = pfn;
    c->pfn_data = pfn_data;
    ttg_event_call(c, TTG_EVENT_OPEN, (void*)url);
    tt_log_debug("%lu %ld %s", c->id, c->fd, url);
  }
  return c;
}

struct ttg_conn* ttg_net_connect(struct ttg_mgr* mgr, const char* url,
                                 ttg_event_handler fn, void* fn_data) {
  return ttg_net_connect_svc(mgr, url, fn, fn_data, NULL, NULL);
}

struct ttg_conn* ttg_net_listen(struct ttg_mgr* mgr, const char* url,
                                ttg_event_handler fn, void* fn_data) {
  struct ttg_conn* c = NULL;

  if ((c = ttg_net_alloc_conn(mgr)) == NULL) {
    tt_log_err("OOM %s", url);
  } else if (!ttg_sock_open_listener(c, url)) {
    tt_log_err("Cannot listen on %s — check hostname/port in config", url);
    tt_log_err("  See https://tinytrack.dev/docs/troubleshooting#port-in-use");
    free(c);
    c = NULL;
  } else {
    c->is_listening = 1;
    LIST_ADD_HEAD(struct ttg_conn, &mgr->conns, c);
    c->fn = fn;
    c->fn_data = fn_data;
    c->is_tls = (ttg_url_is_ssl(url) != 0);
    ttg_event_call(c, TTG_EVENT_OPEN, NULL);
    tt_log_debug("%lu %ld %s", c->id, c->fd, url);
  }
  return c;
}

struct tt_timer* ttg_net_timer_add(struct ttg_mgr* mgr, uint64_t ms,
                                   unsigned flags, void (*fn)(void*),
                                   void* arg) {
  struct tt_timer* t = (struct tt_timer*)calloc(1, sizeof(*t));
  if (t != NULL) {
    flags |= TIMER_AUTODELETE; /* Automatically delete timer */
    tt_timer_init(&mgr->timers, t, ms, flags, fn, arg);
  }
  return t;
}

void ttg_net_mgr_init(struct ttg_mgr* mgr, const struct ttg_tls_cfg* tls) {
  memset(mgr, 0, sizeof(*mgr));
  if ((mgr->epoll_fd = epoll_create1(EPOLL_CLOEXEC)) < 0)
    tt_log_err("epoll_create1 errno %d", errno);
  signal(SIGPIPE, SIG_IGN);
  mgr->pipe = TTG_INVALID_SOCKET;
  if (tls)
    ttg_tls_ctx_init(mgr, tls);
  tt_log_debug("MG_IO_SIZE: %u, TLS: %s", TTG_IO_SIZE,
               mgr->tls_ctx ? "OpenSSL" : "disabled");
}

void ttg_net_mgr_free(struct ttg_mgr* mgr) {
  struct ttg_conn* c;
  struct tt_timer *tmp, *t = mgr->timers;
  while (t != NULL)
    tmp = t->next, free(t), t = tmp;
  mgr->timers = NULL; /* Important. Next poll call will not touch timers */
  for (c = mgr->conns; c != NULL; c = c->next)
    c->is_closing = 1;
  ttg_net_mgr_poll(mgr, 0);
  tt_log_debug("All connections closed");
  if (mgr->epoll_fd >= 0)
    close(mgr->epoll_fd), mgr->epoll_fd = -1;
  ttg_tls_ctx_free(mgr);
}

void ttg_net_mgr_poll(struct ttg_mgr* mgr, int ms) {
  struct ttg_conn *c, *tmp;
  uint64_t now;

  ttg_sock_iotest(mgr, ms);
  now = ttg_util_millis();

  tt_timer_poll(&mgr->timers, now);

  for (c = mgr->conns; c != NULL; c = tmp) {
    bool is_resp = c->is_resp;
    tmp = c->next;
    ttg_event_call(c, TTG_EVENT_POLL, &now);
    if (is_resp && !c->is_resp) {
      long n = 0;
      ttg_event_call(c, TTG_EVENT_READ, &n);
    }

    /*
    tt_log_debug("%lu %c%c %c%c%c%c%c %lu", c->id, c->is_readable ? 'r' : '-',
                 c->is_writable ? 'w' : '-', c->is_tls ? 'T' : 't',
                 c->is_connecting ? 'C' : 'c', c->is_tls_hs ? 'H' : 'h',
                 c->is_resolving ? 'R' : 'r', c->is_closing ? 'C' : 'c',
                 /* c->rtls.len  0);
    */

    if (c->is_resolving || c->is_closing) {
      /* Do nothing */
    } else if (c->is_listening /* && c->is_udp == 0 */) {
      if (c->is_readable)
        ttg_sock_accept_conn(mgr, c);
    } else if (c->is_connecting) {
      if (c->is_readable || c->is_writable)
        ttg_sock_connect_conn(c);
    } else {
      if (c->is_readable)
        ttg_sock_read_conn(c);
      if (c->is_writable)
        ttg_sock_write_conn(c);
      /* if (c->is_tls && !c->is_tls_hs && c->send.len == 0) mg_tls_flush(c); */
    }

    if (c->is_draining && c->send.len == 0)
      c->is_closing = 1;
    /* Header receive timeout */
    if (!c->is_closing && c->is_accepted && !c->is_websocket &&
        c->accept_time > 0) {
      uint32_t hto_ms = mgr->header_timeout_ms ? mgr->header_timeout_ms : 10000;
      if (now - (uint64_t)c->accept_time * 1000 > hto_ms) {
        tt_log_info("%lu header timeout (%u ms), closing", c->id, hto_ms);
        c->is_closing = 1;
      }
    }
    /* Idle timeout for WS connections */
    if (!c->is_closing && c->is_websocket && mgr->idle_timeout_ms > 0 &&
        c->last_recv_time > 0) {
      if (now - (uint64_t)c->last_recv_time * 1000 > mgr->idle_timeout_ms) {
        tt_log_info("%lu idle timeout (%u ms), closing", c->id,
                    mgr->idle_timeout_ms);
        c->is_closing = 1;
      }
    }
    if (c->is_closing)
      ttg_sock_close_conn(c);
  }
}