#ifndef TTG_EVENT_H
#define TTG_EVENT_H

#include <stdbool.h>

enum {
  TTG_EVENT_ERROR, /* Ошибка                           char *error_message */
  TTG_EVENT_OPEN,  /* Соединение открыто               NULL */
  TTG_EVENT_POLL, /* Цикл mg_mgr_poll запущен         uint64_t *uptime_millis */
  TTG_EVENT_RESOLVE, /* Имя хоста разрешено              NULL */
  TTG_EVENT_CONNECT, /* Соединение установлено           NULL */
  TTG_EVENT_ACCEPT,  /* Соединение принято               NULL */
  TTG_EVENT_TLS_HS,  /* TLS handshake успешно            NULL */
  TTG_EVENT_READ,    /* Данные, полученные от сокета     long *bytes_read */
  TTG_EVENT_WRITE,   /* Данные, записанные в сокет       long *bytes_written */
  TTG_EVENT_CLOSE,   /* Соединение закрыто               NULL */
  TTG_EVENT_HTTP_HDRS, /* HTTP headers                     struct
                        * mg_http_message
                        * */
  TTG_EVENT_HTTP_MSG, /* Full HTTP request/response       struct mg_http_message
                       * *
                       */
  TTG_EVENT_WS_OPEN,  /* Websocket handshake выполнено    struct mg_http_message
                       * *
                       */
  TTG_EVENT_WS_MSG,   /* Websocket msg, text или bin      struct mg_ws_message *
                       */
  // TTG_EVENT_WS_METRICS,
  TTG_EVENT_WS_CTL, /* Websocket control msg            struct mg_ws_message *
                     */
  TTG_EVENT_USER    /* Начальный идентификатор для событий пользователей */
};

struct ttg_conn;
typedef void (*ttg_event_handler_t)(struct ttg_conn*, int ev, void* ev_data);
void ttg_event_call(struct ttg_conn* c, int ev, void* ev_data);
void ttg_event_error(struct ttg_conn* c, const char* fmt, ...);

#endif  // TTG_EVENT_H