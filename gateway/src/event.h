#ifndef TTG_EVENT_H
#define TTG_EVENT_H

#include <stdbool.h>

enum {
  TTG_EVENT_ERROR, /* Error                              char *error_message */
  TTG_EVENT_OPEN,  /* Connection opened                  NULL */
  TTG_EVENT_POLL, /* mg_mgr_poll loop running           uint64_t *uptime_millis */
  TTG_EVENT_RESOLVE, /* Hostname resolved                  NULL */
  TTG_EVENT_CONNECT, /* Connection established             NULL */
  TTG_EVENT_ACCEPT,  /* Connection accepted                NULL */
  TTG_EVENT_TLS_HS,  /* TLS handshake complete             NULL */
  TTG_EVENT_READ,    /* Data received from socket          long *bytes_read */
  TTG_EVENT_WRITE,   /* Data written to socket             long *bytes_written */
  TTG_EVENT_CLOSE,   /* Connection closed                  NULL */
  TTG_EVENT_HTTP_HDRS, /* HTTP headers                     struct
                        * mg_http_message
                        * */
  TTG_EVENT_HTTP_MSG, /* Full HTTP request/response       struct mg_http_message
                       * *
                       */
  TTG_EVENT_WS_OPEN,  /* WebSocket handshake complete       struct mg_http_message
                       * *
                       */
  TTG_EVENT_WS_MSG,   /* WebSocket msg, text or bin         struct mg_ws_message *
                       */
  /* TTG_EVENT_WS_METRICS, */
  TTG_EVENT_WS_CTL, /* Websocket control msg            struct mg_ws_message *
                     */
  TTG_EVENT_USER    /* Starting identifier for user events */
};

struct ttg_conn;
typedef void (*ttg_event_handler)(struct ttg_conn*, int ev, void* ev_data);
void ttg_event_call(struct ttg_conn*, int ev, void* ev_data);
void ttg_event_error(struct ttg_conn*, const char* fmt, ...);

#endif  /* TTG_EVENT_H */