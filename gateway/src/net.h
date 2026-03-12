#ifndef TTG_NET_H
#define TTG_NET_H

#include <time.h>

#include "common/sink/log.h"
#include "common/timer.h"
#include "event.h"
#include "iobuf.h"

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

/* Адрес */
struct ttg_addr {
  uint8_t ip[16];
  uint16_t port;
};

/* Менеджер */
struct ttg_mgr {
  int epoll_fd;
  unsigned long nextid;   /* Следующий идентификатор подключения */
  struct ttg_conn* conns; /* Список активных соединений */

  void* userdata; /* Произвольный указатель пользовательских данных */
  /* void *tls_ctx; */
  struct tt_timer* timers; /* Активные таймеры */
  TTG_SOCK_TYPE pipe;
};

/* Соедниение */
struct ttg_conn {
  ttg_event_handler_t
      fn;        /* Указанная пользователем функция обработчика событий */
  void* fn_data; /* Указанный пользователем параметр этой функци */
  ttg_event_handler_t
      pfn;        /* Протокол-специфическая функция обработчика событий */
  void* pfn_data; /* Протокол-специфический параметр этой функции */
  struct ttg_conn* next;
  struct ttg_mgr* mgr;
  struct ttg_addr local;
  struct ttg_addr remote;
  void* fd;
  unsigned long id;

  struct ttg_iobuf recv; /* Входящие данные */
  struct ttg_iobuf send; /* Исходящие данные */
  // struct ttg_iobuf prof; /* Данные профиля, включены с помощью
  // MG_ENABLE_PROFILE */ struct ttg_iobuf rtls; /* TLS only. Входящие
  // зашифрованные данные */

  char data[TTG_DATA_SIZE];
  // void *tls;

  // ! данные клиента: интервал, алерты
  // ! стейт клиента

  uint32_t update_interval_ms; /* Персональный интервал (1000, 5000, 10000) */
  time_t last_update_time;     /* Время последнего обновления */

  unsigned is_listening : 1; /* Прослушиваем соединение */
  unsigned is_client : 1;    /* Исходящее (клиентское) соединение */
  unsigned is_accepted : 1;  /* Входящее (серверное) соединение */
  unsigned is_resolving
      : 1; /* Выполнение неблокирующего соединения DNS разрешо */
  unsigned is_connecting : 1; /* Неблокирующее соединение в процессе */
  unsigned is_tls : 1;        /* Подключение с поддержкой TLS */
  unsigned is_tls_hs : 1;     /* TLS handshake в процессе */
  unsigned is_websocket : 1;  /* WebSocket-соединение */
  unsigned is_closing : 1;    /* Закрыть и принудительно удалить соединение */
  unsigned is_full
      : 1; /* Останавить чтение до тех пор, пока оно не будет очищено */
  unsigned is_resp : 1;     /* Ответ все еще генерируется */
  unsigned is_readable : 1; /* Соединение готово к чтению */
  unsigned is_writable : 1; /* Соединение готово к записи  */

  unsigned is_hexdumping : 1;  // Hexdump in/out traffic
  unsigned is_draining : 1;    // Отправить оставшиеся данные, затем закрыть и
                               // освободить память
};

void ttg_net_mgr_init(struct ttg_mgr*);
void ttg_net_mgr_poll(struct ttg_mgr*, int ms);
void ttg_net_mgr_free(struct ttg_mgr*);

struct ttg_conn* ttg_net_alloc_conn(struct ttg_mgr*);
void ttg_net_close_conn(struct ttg_conn*);

struct ttg_conn* ttg_net_listen(struct ttg_mgr*, const char* url,
                                ttg_event_handler_t fn, void* fn_data);
struct ttg_conn* ttg_net_connect(struct ttg_mgr* mgr, const char* url,
                                 ttg_event_handler_t fn, void* fn_data);
struct ttg_conn* ttg_net_connect_svc(struct ttg_mgr* mgr, const char* url,
                                     ttg_event_handler_t fn, void* fn_data,
                                     ttg_event_handler_t pfn, void* pfn_data);

struct tt_timer* ttg_net_timer_add(struct ttg_mgr*, uint64_t ms, unsigned flags,
                                   void (*fn)(void*), void* arg);

size_t ttg_net_printf(struct ttg_conn*, const char* fmt, ...);
size_t ttg_net_vprintf(struct ttg_conn*, const char* fmt, va_list* ap);

#endif  // TTG_NET_H