#ifndef TTG_NET_H
#define TTG_NET_H

#include <time.h>

#include "common/log/log.h"
#include "common/timer.h"
#include "event.h"
#include "iobuf.h"
#include "tls.h"

#define TTG_DATA_SIZE 32
#define TTG_SOCK_TYPE int

#define LIST_ADD_HEAD(type_, head_, elem_) \
  do {                                     \
    (elem_)->next = (*head_);              \
    *(head_) = (elem_);                    \
  } while (0)

#define LIST_ADD_TAIL(type_, head_, elem_) \
  do {                                     \
    type_** h = head_;                     \
    while (*h != NULL)                     \
      h = &(*h)->next;                     \
    *h = (elem_);                          \
  } while (0)

#define LIST_DELETE(type_, head_, elem_) \
  do {                                   \
    type_** h = head_;                   \
    while (*h != (elem_))                \
      h = &(*h)->next;                   \
    *h = (elem_)->next;                  \
  } while (0)

/* Address */
struct ttg_addr {
  uint8_t ip[16];
  uint16_t port;
};

/* Manager */
struct ttg_mgr {
  int epoll_fd;
  unsigned long nextid;   /* Next connection identifier */
  struct ttg_conn* conns; /* List of active connections */

  void* userdata;          /* Arbitrary user data pointer */
  void* tls_ctx;           /* struct ttg_tls_ctx*, NULL if TLS disabled */
  struct tt_timer* timers; /* Active timers */
  TTG_SOCK_TYPE pipe;
  uint32_t max_connections; /* 0 = unlimited */
};

/* Connection */
struct ttg_conn {
  ttg_event_handler fn;  /* User-provided event handler function */
  void* fn_data;         /* User-provided parameter for this function */
  ttg_event_handler pfn; /* Protocol-specific event handler function */
  void* pfn_data;        /* Protocol-specific parameter for this function */
  struct ttg_conn* next;
  struct ttg_mgr* mgr;
  struct ttg_addr local;
  struct ttg_addr remote;
  void* fd;
  unsigned long id;

  struct ttg_iobuf recv; /* Incoming data */
  struct ttg_iobuf send; /* Outgoing data */
  /* struct ttg_iobuf prof;
   * MG_ENABLE_PROFILE - struct ttg_iobuf rtls; TLS only. Incoming
   * encrypted data */

  char data[TTG_DATA_SIZE];
  void* tls; /* struct ttg_tls*, NULL if TLS disabled */

  /* client data: interval, alerts */
  /* client state */

  uint32_t update_interval_ms; /* Per-connection interval (1000, 5000, 10000) */
  time_t last_update_time;     /* Last update time */
  time_t accept_time;          /* Time of accept(); 0 for outgoing connections */
  time_t auth_deadline;        /* Deadline for CMD_AUTH (0 = no deadline) */
  uint8_t sub_level; /* Ring level subscription: RING_LEVEL_L1/L2/L3 */

  unsigned is_listening : 1;     /* Listening for connections */
  unsigned is_client : 1;        /* Outgoing (client) connection */
  unsigned is_accepted : 1;      /* Incoming (server) connection */
  unsigned is_resolving : 1;     /* Non-blocking DNS resolution in progress */
  unsigned streaming_paused : 1; /* CMD_STOP received; skip timer pushes */
  unsigned is_connecting : 1;    /* Non-blocking connect in progress */
  unsigned is_tls : 1;           /* TLS-enabled connection */
  unsigned is_tls_hs : 1;        /* TLS handshake in progress */
  unsigned is_websocket : 1;     /* WebSocket connection */
  unsigned is_closing : 1;       /* Close and forcibly remove connection */
  unsigned is_full : 1;          /* Stop reading until cleared */
  unsigned is_resp : 1;          /* Response is still being generated */
  unsigned is_readable : 1;      /* Connection ready for reading */
  unsigned is_writable : 1;      /* Connection ready for writing*/
  unsigned is_authed : 1;        /* Authentication passed (or not required) */

  unsigned is_hexdumping : 1; /* Hexdump in/out traffic */
  unsigned is_draining : 1;   /* Send remaining data, then close and
                                 free memory */
};

void ttg_net_mgr_init(struct ttg_mgr*, const struct ttg_tls_cfg* tls);
void ttg_net_mgr_poll(struct ttg_mgr*, int ms);
void ttg_net_mgr_free(struct ttg_mgr*);

struct ttg_conn* ttg_net_alloc_conn(struct ttg_mgr*);
void ttg_net_close_conn(struct ttg_conn*);

struct ttg_conn* ttg_net_listen(struct ttg_mgr*, const char* ttg_url,
                                ttg_event_handler fn, void* fn_data);
struct ttg_conn* ttg_net_connect(struct ttg_mgr* mgr, const char* ttg_url,
                                 ttg_event_handler fn, void* fn_data);
struct ttg_conn* ttg_net_connect_svc(struct ttg_mgr* mgr, const char* ttg_url,
                                     ttg_event_handler fn, void* fn_data,
                                     ttg_event_handler pfn, void* pfn_data);

struct tt_timer* ttg_net_timer_add(struct ttg_mgr*, uint64_t ms, unsigned flags,
                                   void (*fn)(void*), void* arg);

size_t ttg_net_printf(struct ttg_conn*, const char* fmt, ...);
size_t ttg_net_vprintf(struct ttg_conn*, const char* fmt, va_list* ap);

#endif /* TTG_NET_H */