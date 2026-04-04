#ifndef TTG_SOCK_H
#define TTG_SOCK_H

#include <errno.h>
#include <fcntl.h>
#include <netinet/in.h>
/* #include <netinet/tcp.h> */
#include <stdbool.h>
#include <sys/epoll.h>
#include <sys/socket.h>
#include <unistd.h>

#include "net.h"
#include "url.h"

enum { TTG_IO_ERR = -1, TTG_IO_WAIT = -2, TTG_IO_RESET = -3 };

/* #define TTG_SOCK_TYPE int */
#define TTG_INVALID_SOCKET (-1)
#define TTG_SOCK_LISTEN_BACKLOG_SIZE 128
#define TTG_MAX_RECV_SIZE (3UL * 1024UL * 1024UL) /* Maximum recv IO buffer size */

#ifndef closesocket
#define closesocket(x) close(x)
#endif

#define FD(c_) ((TTG_SOCK_TYPE)(size_t)(c_)->fd)
#define S2PTR(s_) ((void*)(size_t)(s_))

#define MSG_NONBLOCKING 0

#define TTG_SOCK_ERR(errcode) ((errcode) < 0 ? errno : 0)
#define TTG_SOCK_INTR(fd) (fd == TTG_INVALID_SOCKET && TTG_SOCK_ERR(-1) == EINTR)
#define TTG_SOCK_PENDING(errcode) \
  (((errcode) < 0) && (errno == EINPROGRESS || errno == EWOULDBLOCK))
#define TTG_SOCK_RESET(errcode) (((errcode) < 0) && (errno == EPIPE || errno == ECONNRESET))

#define TTG_EPOLL_ADD(c)                                                 \
  do {                                                                   \
    struct epoll_event ev = {EPOLLIN | EPOLLERR | EPOLLHUP, {c}};        \
    epoll_ctl(c->mgr->epoll_fd, EPOLL_CTL_ADD, (int)(size_t)c->fd, &ev); \
  } while (0)
#define TTG_EPOLL_MOD(c, wr)                                             \
  do {                                                                   \
    struct epoll_event ev = {EPOLLIN | EPOLLERR | EPOLLHUP, {c}};        \
    if (wr) ev.events |= EPOLLOUT;                                       \
    epoll_ctl(c->mgr->epoll_fd, EPOLL_CTL_MOD, (int)(size_t)c->fd, &ev); \
  } while (0)

union usa {
  struct sockaddr sa;
  struct sockaddr_in sin;
};

void ttg_sock_set_nonblocking(TTG_SOCK_TYPE);
bool ttg_sock_open_listener(struct ttg_conn*, const char*);
bool ttg_sock_send(struct ttg_conn*, const void* buf, size_t);

void ttg_sock_accept_conn(struct ttg_mgr*, struct ttg_conn*);
void ttg_sock_connect_conn(struct ttg_conn*);
void ttg_sock_read_conn(struct ttg_conn*);
void ttg_sock_write_conn(struct ttg_conn*);
void ttg_sock_close_conn(struct ttg_conn*);

void ttg_sock_iotest(struct ttg_mgr* mgr, int ms);

#endif /* TTG_SOCK_H */