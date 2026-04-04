#include "sock.h"

#include <stdlib.h>
#include <string.h>
#include <sys/time.h>

#include "common/log/log.h"
#include "printf.h"
#include "tls.h"

static bool atone(struct ttg_str str, struct ttg_addr* addr) {
  if (str.len > 0) return false;
  memset(addr->ip, 0, sizeof(addr->ip));
  return true;
}

static bool atonl(struct ttg_str str, struct ttg_addr* addr) {
  /* uint32_t localhost = ntohl(0x7f000001); */
  uint32_t localhost = htonl(0x7f000001);
  if (ttg_str_casecmp(str, str("localhost")) != 0) return false;
  memcpy(addr->ip, &localhost, sizeof(uint32_t));
  return true;
}

static bool aton4(struct ttg_str str, struct ttg_addr* addr) {
  uint8_t data[4] = {0, 0, 0, 0};
  size_t i, num_dots = 0;
  for (i = 0; i < str.len; i++) {
    if (str.buf[i] >= '0' && str.buf[i] <= '9') {
      int octet = data[num_dots] * 10 + (str.buf[i] - '0');
      if (octet > 255) return false;
      data[num_dots] = (uint8_t)octet;
    } else if (str.buf[i] == '.') {
      if (num_dots >= 3 || i == 0 || str.buf[i - 1] == '.') return false;
      num_dots++;
    } else {
      return false;
    }
  }
  if (num_dots != 3 || str.buf[i - 1] == '.') return false;
  memcpy(&addr->ip, data, sizeof(data));
  return true;
}

bool aton(struct ttg_str str, struct ttg_addr* addr) {
  return atone(str, addr) || atonl(str, addr) || aton4(str, addr);
}

static socklen_t tousa(struct ttg_addr* a, union usa* usa) {
  socklen_t len = sizeof(usa->sin);
  memset(usa, 0, sizeof(*usa));
  usa->sin.sin_family = AF_INET;
  usa->sin.sin_port = a->port;
  memcpy(&usa->sin.sin_addr, a->ip, sizeof(uint32_t));
  return len;
}

static void setlocaddr(TTG_SOCK_TYPE fd, struct ttg_addr* a) {
  union usa usa;
  memset(&usa, 0, sizeof(usa));
  socklen_t n = sizeof(usa);
  if (getsockname(fd, &usa.sa, &n) == 0) {
    a->port = usa.sin.sin_port;
    memcpy(&a->ip, &usa.sin.sin_addr, sizeof(uint32_t));
  }
}

bool ttg_sock_send(struct ttg_conn* c, const void* buf, size_t len) {
  return ttg_iobuf_add(&c->send, c->send.len, buf, len);
}

void ttg_sock_set_nonblocking(TTG_SOCK_TYPE fd) {
  int flags;

  if ((flags = fcntl(fd, F_GETFL, 0)) < 0) {
    tt_log_err("Failure to receive fcntl flags (%s)", strerror(errno));
    return;
  }

  if ((fcntl(fd, F_SETFL, flags | O_NONBLOCK)) < 0) { /* Non-blocking mode */
    tt_log_err("Failure to set non-blocking mode (%s)", strerror(errno));
    return;
  }

  if ((fcntl(fd, F_SETFD, FD_CLOEXEC)) < 0) {
    tt_log_err("Failure to set descriptor flags (%s)", strerror(errno));
    return;
  }
}

bool ttg_sock_open_listener(struct ttg_conn* c, const char* url) {
  TTG_SOCK_TYPE fd = TTG_INVALID_SOCKET;
  bool success = false;
  /* c->local.port = htohs(ttg_url_port(url)); */
  c->local.port = htons(ttg_url_port(url));
  if (!aton(ttg_url_host(url), &c->local)) {
    tt_log_err("invalid listening URL: %s", url);
  } else {
    union usa usa;
    int rc, on = 1;
    socklen_t slen = tousa(&c->local, &usa);
    (void)on;

    if ((fd = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP)) == TTG_INVALID_SOCKET) {
      tt_log_err("socket: %d", TTG_SOCK_ERR(-1));
    } else if ((rc = setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, (char*)&on, sizeof(on))) != 0) {
      tt_log_err("setsockopt(SO_REUSEADDR): %d", TTG_SOCK_ERR(rc));
    } else if ((rc = bind(fd, &usa.sa, slen)) != 0) {
      tt_log_err("bind: %d", TTG_SOCK_ERR(rc));
    } else if ((rc = listen(fd, TTG_SOCK_LISTEN_BACKLOG_SIZE)) != 0) {
      tt_log_err("listen: %d", TTG_SOCK_ERR(rc));
    } else {
      setlocaddr(fd, &c->local);
      ttg_sock_set_nonblocking(fd);
      c->fd = S2PTR(fd);
      /* TTG_EPOLL_ADD(c); */

      do {
        struct epoll_event ev = {EPOLLIN | EPOLLERR | EPOLLHUP, {c}};
        epoll_ctl(c->mgr->epoll_fd, EPOLL_CTL_ADD, (int)(size_t)c->fd, &ev);
      } while (0);

      success = true;
    }
  }

  if (success == false && fd != TTG_INVALID_SOCKET) closesocket(fd);
  return success;
}

static TTG_SOCK_TYPE raccept(TTG_SOCK_TYPE sock, union usa* usa, socklen_t* len) {
  TTG_SOCK_TYPE fd = TTG_INVALID_SOCKET;
  do {
    memset(usa, 0, sizeof(*usa));
    fd = accept(sock, &usa->sa, len);
  } while (TTG_SOCK_INTR(fd));
  return fd;
}

static void tomgaddr(union usa* usa, struct ttg_addr* a) {
  a->port = usa->sin.sin_port;
  memcpy(&a->ip, &usa->sin.sin_addr, sizeof(uint32_t));
}

static void setsockopts(struct ttg_conn* c) {
  (void)c;
  int on = 1;

  if (setsockopt(FD(c), SOL_SOCKET, SO_KEEPALIVE, (char*)&on, sizeof(on)) != 0) (void)0;
}

void ttg_sock_accept_conn(struct ttg_mgr* mgr, struct ttg_conn* lsn) {
  struct ttg_conn* c = NULL;
  union usa usa;
  socklen_t sa_len = sizeof(usa);
  TTG_SOCK_TYPE fd = raccept(FD(lsn), &usa, &sa_len);
  if (fd == TTG_INVALID_SOCKET) {
    tt_log_err("%lu accept failed, errno %d", lsn->id, TTG_SOCK_ERR(-1));
  } else if ((c = ttg_net_alloc_conn(mgr)) == NULL) {
    tt_log_err("%lu OOM", lsn->id);
    closesocket(fd);
  } else {
    tomgaddr(&usa, &c->remote);
    LIST_ADD_HEAD(struct ttg_conn, &mgr->conns, c);
    c->fd = S2PTR(fd);
    TTG_EPOLL_ADD(c);
    ttg_sock_set_nonblocking(FD(c));
    setsockopts(c);
    c->is_accepted = 1;
    c->is_hexdumping = lsn->is_hexdumping;
    c->local = lsn->local;
    c->pfn = lsn->pfn;
    c->pfn_data = lsn->pfn_data;
    c->fn = lsn->fn;
    c->fn_data = lsn->fn_data;
    if (lsn->is_tls) {
      if (ttg_tls_init(c) != 0) {
        tt_log_err("%lu TLS init failed, closing", c->id);
        c->is_closing = 1;
      }
    }
    // cppcheck-suppress unusedVariable
    char rem[24];
    // cppcheck-suppress unusedVariable
    char loc[24];
    tt_log_debug("%lu %d accepted %s -> %s", c->id, FD(c),
                 ttg_addr_str(&c->remote, rem, sizeof(rem)),
                 ttg_addr_str(&c->local, loc, sizeof(loc)));
    ttg_event_call(c, TTG_EVENT_OPEN, NULL);
    ttg_event_call(c, TTG_EVENT_ACCEPT, NULL);
  }
}

void ttg_sock_connect_conn(struct ttg_conn* c) {
  union usa usa;
  socklen_t n = sizeof(usa);
  if (getpeername(FD(c), &usa.sa, &n) == 0) {
    c->is_connecting = 0;
    setlocaddr(FD(c), &c->local);
    ttg_event_call(c, TTG_EVENT_CONNECT, NULL);
    TTG_EPOLL_MOD(c, 0);
    if (c->is_tls_hs) ttg_tls_handshake(c);
  } else {
    ttg_event_error(c, "socket error");
  }
}

static long iorecv(struct ttg_conn* c, void* buf, size_t len) {
  long n = recv(FD(c), (char*)buf, len, MSG_NONBLOCKING);

  tt_log_debug("%lu %ld %d", c->id, n, TTG_SOCK_ERR(n));

  if (TTG_SOCK_PENDING(n)) return TTG_IO_WAIT;
  if (TTG_SOCK_RESET(n)) return TTG_IO_RESET;
  if (n <= 0) return TTG_IO_ERR;

  return n;
}

long iosend(struct ttg_conn* c, const void* buf, size_t len) {
  long n = send(FD(c), (char*)buf, len, MSG_NONBLOCKING);

  tt_log_debug("%lu %ld %d", c->id, n, TTG_SOCK_ERR(n));

  if (TTG_SOCK_PENDING(n)) return TTG_IO_WAIT;
  if (TTG_SOCK_RESET(n)) return TTG_IO_RESET;
  if (n <= 0) return TTG_IO_ERR;
  return n;
}

static bool ioalloc(struct ttg_conn* c, struct ttg_iobuf* io) {
  bool res = false;
  if (io->len >= TTG_MAX_RECV_SIZE) {
    ttg_event_error(c, "MG_MAX_RECV_SIZE");
  } else if (io->size <= io->len && !ttg_iobuf_resize(io, io->size + TTG_IO_SIZE)) {
    ttg_event_error(c, "OOM");
  } else {
    res = true;
  }
  return res;
}

static void iolog(struct ttg_conn* c, char* buf, long n, bool r) {
  if (n == TTG_IO_WAIT) {
    /* Do nothing */
  } else if (n <= 0) {
    c->is_closing = 1; /* Termination. Don't call mg_error() */
  } else {             /* n > 0 */
    if (c->is_hexdumping) {
      char loc[24], rem[24];
      tt_log_info("\n-- %lu %s %s %s %ld", c->id, ttg_addr_str(&c->local, loc, sizeof(loc)),
                  r ? "<-" : "->", ttg_addr_str(&c->remote, rem, sizeof(rem)), n);
    }
    if (r) {
      c->recv.len += (size_t)n;
      ttg_event_call(c, TTG_EVENT_READ, &n);
    } else {
      ttg_iobuf_del(&c->send, 0, (size_t)n);
      /* if (c->send.len == 0) mg_iobuf_resize(&c->send, 0); */
      if (c->send.len == 0) {
        TTG_EPOLL_MOD(c, 0);
      }
      ttg_event_call(c, TTG_EVENT_WRITE, &n);
    }
  }
}

void ttg_sock_read_conn(struct ttg_conn* c) {
  if (c->is_tls_hs) {
    ttg_tls_handshake(c);
    return;
  }
  if (ioalloc(c, &c->recv)) {
    char* buf = (char*)&c->recv.buf[c->recv.len];
    size_t len = c->recv.size - c->recv.len;
    long n = c->is_tls ? ttg_tls_recv(c, buf, len) : iorecv(c, buf, len);
    iolog(c, buf, n, true);
  }
}

void ttg_sock_write_conn(struct ttg_conn* c) {
  char* buf = (char*)c->send.buf;
  size_t len = c->send.len;
  long n = c->is_tls ? ttg_tls_send(c, buf, len) : iosend(c, buf, len);
  iolog(c, buf, n, false);
}

void ttg_sock_close_conn(struct ttg_conn* c) {
  if (FD(c) != TTG_INVALID_SOCKET) {
    epoll_ctl(c->mgr->epoll_fd, EPOLL_CTL_DEL, FD(c), NULL);
    closesocket(FD(c));
  }
  ttg_net_close_conn(c);
}

static bool can_read(const struct ttg_conn* c) { return c->is_full == false; }

static bool can_write(const struct ttg_conn* c) {
  return c->is_connecting || (c->send.len > 0 && c->is_tls_hs == 0);
}

static bool skip_iotest(const struct ttg_conn* c) {
  return (c->is_closing || c->is_resolving || FD(c) == TTG_INVALID_SOCKET) ||
         (can_read(c) == false && can_write(c) == false);
}
void ttg_sock_iotest(struct ttg_mgr* mgr, int ms) {
  size_t max = 1;
  for (struct ttg_conn* c = mgr->conns; c != NULL; c = c->next) {
    c->is_readable = c->is_writable = 0;
    if (can_write(c)) TTG_EPOLL_MOD(c, 1);
    if (c->is_closing) ms = 1;
    if (ttg_tls_pending(c) > 0) ms = 1, c->is_readable = 1;
    max++;
  }
  struct epoll_event evs[max];
  int n = epoll_wait(mgr->epoll_fd, evs, (int)max, ms);
  for (int i = 0; i < n; i++) {
    struct ttg_conn* c = (struct ttg_conn*)evs[i].data.ptr;
    if (evs[i].events & EPOLLERR) {
      ttg_event_error(c, "socket error");
    } else if (c->is_readable == 0) {
      bool rd = evs[i].events & (EPOLLIN | EPOLLHUP);
      bool wr = evs[i].events & EPOLLOUT;
      c->is_readable = can_read(c) && rd ? 1U : 0;
      c->is_writable = can_write(c) && wr ? 1U : 0;
      if (ttg_tls_pending(c) > 0) c->is_readable = 1;
    }
  }
  (void)skip_iotest;
}