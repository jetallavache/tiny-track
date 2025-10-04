#ifndef SRC_S_SOCK_H
#define SRC_S_SOCK_H

#include <errno.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <stdbool.h>
#include <sys/socket.h>
// #include <netinet/tcp.h>
#include <sys/epoll.h>
#include <unistd.h>

#include "s_net.h"
#include "s_url.h"

enum { S_IO_ERR = -1, S_IO_WAIT = -2, S_IO_RESET = -3 };

// #define S_SOCK_TYPE int
#define S_INVALID_SOCKET (-1)
#define S_SOCK_LISTEN_BACKLOG_SIZE 128
#define S_MAX_RECV_SIZE \
  (3UL * 1024UL * 1024UL) /* Maximum recv IO buffer size */

#ifndef closesocket
#define closesocket(x) close(x)
#endif

#define FD(c_) ((S_SOCK_TYPE)(size_t)(c_)->fd)
#define S2PTR(s_) ((void *)(size_t)(s_))

#define MSG_NONBLOCKING 0

#define S_SOCK_ERR(errcode) ((errcode) < 0 ? errno : 0)
#define S_SOCK_INTR(fd) (fd == S_INVALID_SOCKET && S_SOCK_ERR(-1) == EINTR)
#define S_SOCK_PENDING(errcode) \
  (((errcode) < 0) && (errno == EINPROGRESS || errno == EWOULDBLOCK))
#define S_SOCK_RESET(errcode) \
  (((errcode) < 0) && (errno == EPIPE || errno == ECONNRESET))

#define S_EPOLL_ADD(c)                                                   \
  do {                                                                   \
    struct epoll_event ev = {EPOLLIN | EPOLLERR | EPOLLHUP, {c}};        \
    epoll_ctl(c->mgr->epoll_fd, EPOLL_CTL_ADD, (int)(size_t)c->fd, &ev); \
  } while (0)
#define S_EPOLL_MOD(c, wr)                                               \
  do {                                                                   \
    struct epoll_event ev = {EPOLLIN | EPOLLERR | EPOLLHUP, {c}};        \
    if (wr) ev.events |= EPOLLOUT;                                       \
    epoll_ctl(c->mgr->epoll_fd, EPOLL_CTL_MOD, (int)(size_t)c->fd, &ev); \
  } while (0)

union usa {
  struct sockaddr sa;
  struct sockaddr_in sin;
};

void s_sock_set_nonblocking(S_SOCK_TYPE);
bool s_sock_open_listener(struct s_conn *, const char *);
bool s_sock_send(struct s_conn *, const void *buf, size_t);

void s_sock_accept_conn(struct s_mgr *, struct s_conn *);
void s_sock_connect_conn(struct s_conn *);
void s_sock_read_conn(struct s_conn *);
void s_sock_write_conn(struct s_conn *);
void s_sock_close_conn(struct s_conn *);

void s_sock_iotest(struct s_mgr *mgr, int ms);

#endif  // SRC_S_SOCK_H