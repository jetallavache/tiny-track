#ifndef SRC_API_WS_H
#define SRC_API_WS_H

#include <stdarg.h>
#include <stdint.h>

#include "../server/net.h"
#include "../utils/str.h"
#include "http.h"

#define WS_OP_CONTINUATION 0x0
#define WS_OP_TEXT 0x1
#define WS_OP_BINARY 0x2
#define WS_OP_CLOSE 0x8
#define WS_OP_PING 0x9
#define WS_OP_PONG 0xA

struct api_ws_message {
  struct str_t data; /* Данные сообщения WebSocket */
  uint8_t flags;     /* Флаги сообщения WebSocket */
};

struct s_conn* api_ws_connect(struct s_mgr*, const char* url,
                              s_event_handler_t fn, void* fn_data,
                              const char* fmt, ...);
void api_ws_upgrade(struct s_conn*, struct api_http_message*, const char* fmt,
                    ...);
size_t api_ws_send(struct s_conn*, const void* buf, size_t len, int op);
size_t api_ws_wrap(struct s_conn*, size_t len, int op);
size_t api_ws_printf(struct s_conn* c, int op, const char* fmt, ...);
size_t api_ws_vprintf(struct s_conn* c, int op, const char* fmt, va_list*);

#endif  // SRC_API_WS_H