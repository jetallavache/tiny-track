#ifndef SRC_S_WS_H
#define SRC_S_WS_H

#include <stdarg.h>
#include <stdint.h>

#include "s_http.h"
#include "s_net.h"
#include "str.h"

#define WS_OP_CONTINUATION 0x0
#define WS_OP_TEXT 0x1
#define WS_OP_BINARY 0x2
#define WS_OP_CLOSE 0x8
#define WS_OP_PING 0x9
#define WS_OP_PONG 0xA

struct s_ws_message {
  struct str_t data; /* Данные сообщения WebSocket */
  uint8_t flags;     /* Флаги сообщения WebSocket */
};

struct s_conn *s_ws_connect(struct s_mgr *, const char *url,
                            s_event_handler_t fn, void *fn_data,
                            const char *fmt, ...);
void s_ws_upgrade(struct s_conn *, struct s_http_message *, const char *fmt,
                  ...);
size_t s_ws_send(struct s_conn *, const void *buf, size_t len, int op);
size_t s_ws_wrap(struct s_conn *, size_t len, int op);
size_t s_ws_printf(struct s_conn *c, int op, const char *fmt, ...);
size_t s_ws_vprintf(struct s_conn *c, int op, const char *fmt, va_list *);

#endif  // SRC_S_WS_H