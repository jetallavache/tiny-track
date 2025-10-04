#include "s_sock.h"

#include <alloca.h>
#include <stdlib.h>
#include <string.h>
#include <sys/time.h>

#include "s_printf.h"

/*
#define MG_U8P(ADDR) ((uint8_t *)(ADDR))

#define S_LOAD_BE16(p) \
  ((uint16_t)(((uint16_t)MG_U8P(p)[0] << 8U) | MG_U8P(p)[1]))
#define S_LOAD_BE32(p)                          \
  ((uint32_t)(((uint32_t)MG_U8P(p)[0] << 24U) | \
              ((uint32_t)MG_U8P(p)[1] << 16U) | \
              ((uint32_t)MG_U8P(p)[2] << 8U) | MG_U8P(p)[3]))

uint16_t ntohs(uint16_t net) { return S_LOAD_BE16(&net); }

uint32_t ntohl(uint32_t net) { return S_LOAD_BE32(&net); }
*/

static bool atone(struct str_t str, struct s_addr *addr) {
  if (str.len > 0) return false;
  memset(addr->ip, 0, sizeof(addr->ip));
  return true;
}

static bool atonl(struct str_t str, struct s_addr *addr) {
  /* uint32_t localhost = ntohl(0x7f000001); */
  uint32_t localhost = htonl(0x7f000001);
  if (str_casecmp(str, str("localhost")) != 0) return false;
  memcpy(addr->ip, &localhost, sizeof(uint32_t));
  return true;
}

static bool aton4(struct str_t str, struct s_addr *addr) {
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

bool aton(struct str_t str, struct s_addr *addr) {
  return atone(str, addr) || atonl(str, addr) || aton4(str, addr);
}

static socklen_t tousa(struct s_addr *a, union usa *usa) {
  socklen_t len = sizeof(usa->sin);
  memset(usa, 0, sizeof(*usa));
  usa->sin.sin_family = AF_INET;
  usa->sin.sin_port = a->port;
  memcpy(&usa->sin.sin_addr, a->ip, sizeof(uint32_t));
  return len;
}

static void setlocaddr(S_SOCK_TYPE fd, struct s_addr *a) {
  union usa usa;
  socklen_t n = sizeof(usa);
  if (getsockname(fd, &usa.sa, &n) == 0) {
    a->port = usa.sin.sin_port;
    memcpy(&a->ip, &usa.sin.sin_addr, sizeof(uint32_t));
  }
}

bool s_sock_send(struct s_conn *c, const void *buf, size_t len) {
  return s_iobuf_add(&c->send, c->send.len, buf, len);
}

void s_sock_set_nonblocking(S_SOCK_TYPE fd) {
  fcntl(fd, F_SETFL, fcntl(fd, F_GETFL, 0) | O_NONBLOCK);  // Non-blocking mode
  fcntl(fd, F_SETFD, FD_CLOEXEC);
  // int flags = fcntl(fd, F_GETFL, 0);
  // if (flags == -1) {
  //     perror("fcntl F_GETFL");
  //     return;
  // }
  // if (fcntl(fd, F_SETFL, flags | O_NONBLOCK) == -1) {
  //     perror("fcntl F_SETFL");
  // }
}

bool s_sock_open_listener(struct s_conn *c, const char *url) {
  S_SOCK_TYPE fd = S_INVALID_SOCKET;
  bool success = false;
  /* c->local.port = htohs(s_url_port(url)); */
  c->local.port = htons(s_url_port(url));
  if (!aton(s_url_host(url), &c->local)) {
    L_ERROR(("invalid listening URL: %s", url));
  } else {
    union usa usa;
    int rc, on = 1;
    socklen_t slen = tousa(&c->local, &usa);
    (void)on;

    if ((fd = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP)) == S_INVALID_SOCKET) {
      L_ERROR(("socket: %d", S_SOCK_ERR(-1)));
    } else if ((rc = setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, (char *)&on,
                                sizeof(on))) != 0) {
      L_ERROR(("setsockopt(SO_REUSEADDR): %d", S_SOCK_ERR(rc)));
    } else if ((rc = bind(fd, &usa.sa, slen)) != 0) {
      L_ERROR(("bind: %d", S_SOCK_ERR(rc)));
    } else if ((rc = listen(fd, S_SOCK_LISTEN_BACKLOG_SIZE)) != 0) {
      L_ERROR(("listen: %d", S_SOCK_ERR(rc)));
    } else {
      setlocaddr(fd, &c->local);
      s_sock_set_nonblocking(fd);
      c->fd = S2PTR(fd);
      // S_EPOLL_ADD(c);

      do {
        struct epoll_event ev = {EPOLLIN | EPOLLERR | EPOLLHUP, {c}};
        epoll_ctl(c->mgr->epoll_fd, EPOLL_CTL_ADD, (int)(size_t)c->fd, &ev);
      } while (0);

      success = true;
    }
  }

  if (success == false && fd != S_INVALID_SOCKET) closesocket(fd);
  return success;
}

static S_SOCK_TYPE raccept(S_SOCK_TYPE sock, union usa *usa, socklen_t *len) {
  S_SOCK_TYPE fd = S_INVALID_SOCKET;
  do {
    memset(usa, 0, sizeof(*usa));
    fd = accept(sock, &usa->sa, len);
  } while (S_SOCK_INTR(fd));
  return fd;
}

static void tomgaddr(union usa *usa, struct s_addr *a) {
  a->port = usa->sin.sin_port;
  memcpy(&a->ip, &usa->sin.sin_addr, sizeof(uint32_t));
}

static void setsockopts(struct s_conn *c) {
  (void)c;
  int on = 1;

  if (setsockopt(FD(c), SOL_SOCKET, SO_KEEPALIVE, (char *)&on, sizeof(on)) != 0)
    (void)0;
}

void s_sock_accept_conn(struct s_mgr *mgr, struct s_conn *lsn) {
  struct s_conn *c = NULL;
  union usa usa;
  socklen_t sa_len = sizeof(usa);
  S_SOCK_TYPE fd = raccept(FD(lsn), &usa, &sa_len);
  if (fd == S_INVALID_SOCKET) {
    L_ERROR(("%lu accept failed, errno %d", lsn->id, S_SOCK_ERR(-1)));
  } else if ((c = s_net_alloc_conn(mgr)) == NULL) {
    L_ERROR(("%lu OOM", lsn->id));
    closesocket(fd);
  } else {
    tomgaddr(&usa, &c->remote);
    LIST_ADD_HEAD(struct s_conn, &mgr->conns, c);
    c->fd = S2PTR(fd);
    S_EPOLL_ADD(c);
    s_sock_set_nonblocking(FD(c));
    setsockopts(c);
    c->is_accepted = 1;
    c->is_hexdumping = lsn->is_hexdumping;
    c->local = lsn->local;
    c->pfn = lsn->pfn;
    c->pfn_data = lsn->pfn_data;
    c->fn = lsn->fn;
    c->fn_data = lsn->fn_data;
    // c->is_tls = lsn->is_tls;
    L_DEBUG(("%lu %ld accepted %M -> %M", c->id, c->fd, s_print_ip_port,
             &c->remote, s_print_ip_port, &c->local));
    s_event_call(c, S_EVENT_OPEN, NULL);
    s_event_call(c, S_EVENT_ACCEPT, NULL);
    if (!c->is_tls_hs) c->is_tls = 0; /* user did not call mg_tls_init() */
  }
}

void s_sock_connect_conn(struct s_conn *c) {
  union usa usa;
  socklen_t n = sizeof(usa);
  /* Use getpeername() to test whether we have connected */
  if (getpeername(FD(c), &usa.sa, &n) == 0) {
    c->is_connecting = 0;
    setlocaddr(FD(c), &c->local);
    s_event_call(c, S_EVENT_CONNECT, NULL);
    S_EPOLL_MOD(c, 0);
    // if (c->is_tls_hs) mg_tls_handshake(c);
    if (!c->is_tls_hs) c->is_tls = 0; /* user did not call mg_tls_init() */
  } else {
    s_event_error(c, "socket error");
  }
}

static long iorecv(struct s_conn *c, void *buf, size_t len) {
  long n = recv(FD(c), (char *)buf, len, MSG_NONBLOCKING);

  L_VERBOSE(("%lu %ld %d", c->id, n, S_SOCK_ERR(n)));

  if (S_SOCK_PENDING(n)) return S_IO_WAIT;
  if (S_SOCK_RESET(n)) return S_IO_RESET;
  if (n <= 0) return S_IO_ERR;

  return n;
}

long iosend(struct s_conn *c, const void *buf, size_t len) {
  long n = send(FD(c), (char *)buf, len, MSG_NONBLOCKING);

  L_VERBOSE(("%lu %ld %d", c->id, n, S_SOCK_ERR(n)));

  if (S_SOCK_PENDING(n)) return S_IO_WAIT;
  if (S_SOCK_RESET(n)) return S_IO_RESET;
  if (n <= 0) return S_IO_ERR;
  return n;
}

static bool ioalloc(struct s_conn *c, struct s_iobuf *io) {
  bool res = false;
  if (io->len >= S_MAX_RECV_SIZE) {
    s_event_error(c, "MG_MAX_RECV_SIZE");
  } else if (io->size <= io->len && !s_iobuf_resize(io, io->size + S_IO_SIZE)) {
    s_event_error(c, "OOM");
  } else {
    res = true;
  }
  return res;
}

static void iolog(struct s_conn *c, char *buf, long n, bool r) {
  if (n == S_IO_WAIT) {
    // Do nothing
  } else if (n <= 0) {
    c->is_closing = 1;  // Termination. Don't call mg_error(): #1529
  } else if (n > 0) {
    if (c->is_hexdumping) {
      L_INFO(("\n-- %lu %M %s %M %ld", c->id, s_print_ip_port, &c->local,
              r ? "<-" : "->", s_print_ip_port, &c->remote, n));
      out_hexdump(buf, (size_t)n);
    }
    if (r) {
      c->recv.len += (size_t)n;
      s_event_call(c, S_EVENT_READ, &n);
    } else {
      s_iobuf_del(&c->send, 0, (size_t)n);
      // if (c->send.len == 0) mg_iobuf_resize(&c->send, 0);
      if (c->send.len == 0) {
        S_EPOLL_MOD(c, 0);
      }
      s_event_call(c, S_EVENT_WRITE, &n);
    }
  }
}

void s_sock_read_conn(struct s_conn *c) {
  if (ioalloc(c, &c->recv)) {
    char *buf = (char *)&c->recv.buf[c->recv.len];
    size_t len = c->recv.size - c->recv.len;
    long n = -1;
    if (c->is_tls) {
      //   // Do not read to the raw TLS buffer if it already has enough.
      //   // This is to prevent overflowing c->rtls if our reads are slow
      //   long m;
      //   if (c->rtls.len < 16 * 1024 + 40) {  // TLS record, header, MAC,
      //   padding
      //     if (!ioalloc(c, &c->rtls)) return;
      //     n = iorecv(c, (char *) &c->rtls.buf[c->rtls.len],
      //                  c->rtls.size - c->rtls.len);
      //     if (n > 0) c->rtls.len += (size_t) n;
      //   }
      //   // there can still be > 16K from last iteration, always mg_tls_recv()
      //   m = c->is_tls_hs ? (long) S_IO_WAIT : mg_tls_recv(c, buf, len);
      //   if (n == S_IO_ERR || n == S_IO_RESET) {  // Windows, see #3031
      //     if (c->rtls.len == 0 || m < 0) {
      //       // Close only when we have fully drained both rtls and TLS
      //       buffers c->is_closing = 1;  // or there's nothing we can do about
      //       it. if (m < 0) m = MG_IO_ERR; // but return last record data, see
      //       #3104
      //     } else { // see #2885
      //       // TLS buffer is capped to max record size, even though, there
      //       can
      //       // be more than one record, give TLS a chance to process them.
      //     }
      //   } else if (c->is_tls_hs) {
      //     mg_tls_handshake(c);
      //   }
      //   n = m;
    } else {
      n = iorecv(c, buf, len);
    }
    L_DEBUG(("%lu %ld %lu:%lu:%lu %ld err %d", c->id, c->fd, c->send.len,
             c->recv.len, /* c->rtls.len */ 0, n, S_SOCK_ERR(n)));
    iolog(c, buf, n, true);
  }
}

void s_sock_write_conn(struct s_conn *c) {
  char *buf = (char *)c->send.buf;
  size_t len = c->send.len;

  //   long n = c->is_tls ? mg_tls_send(c, buf, len) : mg_io_send(c, buf, len);
  long n = iosend(c, buf, len);

  L_DEBUG(("%lu %ld snd %ld/%ld rcv %ld/%ld n=%ld err=%d", c->id, c->fd,
           (long)c->send.len, (long)c->send.size, (long)c->recv.len,
           (long)c->recv.size, n, S_SOCK_ERR(n)));
  iolog(c, buf, n, false);
}

void s_sock_close_conn(struct s_conn *c) {
  if (FD(c) != S_INVALID_SOCKET) {
    epoll_ctl(c->mgr->epoll_fd, EPOLL_CTL_DEL, FD(c), NULL);
    closesocket(FD(c));
  }
  s_net_close_conn(c);
}

static bool can_read(const struct s_conn *c) { return c->is_full == false; }

static bool can_write(const struct s_conn *c) {
  return c->is_connecting || (c->send.len > 0 && c->is_tls_hs == 0);
}

static bool skip_iotest(const struct s_conn *c) {
  return (c->is_closing || c->is_resolving || FD(c) == S_INVALID_SOCKET) ||
         (can_read(c) == false && can_write(c) == false);
}
void s_sock_iotest(struct s_mgr *mgr, int ms) {
  size_t max = 1;
  for (struct s_conn *c = mgr->conns; c != NULL; c = c->next) {
    c->is_readable = c->is_writable = 0;
    // if (c->rtls.len > 0 || mg_tls_pending(c) > 0)
    //   ms = 1, c->is_readable = 1;
    if (can_write(c)) S_EPOLL_MOD(c, 1);
    if (c->is_closing) ms = 1;
    max++;
  }
  struct epoll_event *evs = (struct epoll_event *)alloca(max * sizeof(evs[0]));
  int n = epoll_wait(mgr->epoll_fd, evs, (int)max, ms);
  for (int i = 0; i < n; i++) {
    struct s_conn *c = (struct s_conn *)evs[i].data.ptr;
    if (evs[i].events & EPOLLERR) {
      s_event_error(c, "socket error");
    } else if (c->is_readable == 0) {
      bool rd = evs[i].events & (EPOLLIN | EPOLLHUP);
      bool wr = evs[i].events & EPOLLOUT;
      c->is_readable = can_read(c) && rd ? 1U : 0;
      c->is_writable = can_write(c) && wr ? 1U : 0;
      // if (c->rtls.len > 0 || mg_tls_pending(c) > 0 ) c->is_readable = 1;
    }
  }
  (void)skip_iotest;
}