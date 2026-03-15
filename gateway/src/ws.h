#ifndef TTG_WS_H
#define TTG_WS_H

#include <stdarg.h>
#include <stdint.h>

#include "http.h"
#include "net.h"
#include "str.h"

#define TTG_WS_OP_CONTINUATION 0x0
#define TTG_WS_OP_TEXT 0x1
#define TTG_WS_OP_BINARY 0x2
#define TTG_WS_OP_CLOSE 0x8
#define TTG_WS_OP_PING 0x9
#define TTG_WS_OP_PONG 0xA

struct ttg_ws_message {
  struct ttg_str data; /* WebSocket message data */
  uint8_t flags;       /* WebSocket message flags */
};

struct ttg_conn* ttg_ws_connect(struct ttg_mgr*, const char* url,
                                ttg_event_handler fn, void* fn_data,
                                const char* fmt, ...);
void ttg_ws_upgrade(struct ttg_conn*, struct ttg_http_message*, const char* fmt,
                    ...);
size_t ttg_ws_send(struct ttg_conn*, const void* buf, size_t len, int op);
size_t ttg_ws_wrap(struct ttg_conn*, size_t len, int op);
size_t ttg_ws_printf(struct ttg_conn* c, int op, const char* fmt, ...);
size_t ttg_ws_vprintf(struct ttg_conn* c, int op, const char* fmt, va_list*);

#endif /* TTG_WS_H */