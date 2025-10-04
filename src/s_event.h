#ifndef SRC_S_EVENT_H
#define SRC_S_EVENT_H

#include <stdbool.h>

enum {
  S_EVENT_ERROR,      /* Ошибка                           char *error_message */
  S_EVENT_OPEN,       /* Соединение открыто               NULL */
  S_EVENT_POLL,       /* Цикл mg_mgr_poll запущен         uint64_t *uptime_millis */
  S_EVENT_RESOLVE,    /* Имя хоста разрешено              NULL */
  S_EVENT_CONNECT,    /* Соединение установлено           NULL */
  S_EVENT_ACCEPT,     /* Соединение принято               NULL */
  S_EVENT_TLS_HS,     /* TLS handshake успешно            NULL */
  S_EVENT_READ,       /* Данные, полученные от сокета     long *bytes_read */
  S_EVENT_WRITE,      /* Данные, записанные в сокет       long *bytes_written */
  S_EVENT_CLOSE,      /* Соединение закрыто               NULL */
  S_EVENT_HTTP_HDRS,  /* HTTP headers                     struct mg_http_message * */
  S_EVENT_HTTP_MSG,   /* Full HTTP request/response       struct mg_http_message * */
  S_EVENT_WS_OPEN,    /* Websocket handshake выполнено    struct mg_http_message * */
  S_EVENT_WS_MSG,     /* Websocket msg, text или bin      struct mg_ws_message * */
  // S_EVENT_WS_METRICS,
  S_EVENT_WS_CTL,     /* Websocket control msg            struct mg_ws_message * */
  S_EVENT_USER        /* Начальный идентификатор для событий пользователей */
};

struct s_conn;
typedef void (*s_event_handler_t)(struct s_conn *, int ev, void *ev_data);
void s_event_call(struct s_conn *c, int ev, void *ev_data);
void s_event_error(struct s_conn *c, const char *fmt, ...);

#endif  // SRC_S_EVENT_H