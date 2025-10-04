#ifndef SRC_S_NET_H
#define SRC_S_NET_H

#include "log.h"
#include "m_pack.h"
#include "s_event.h"
#include "s_iobuf.h"
#include "s_timer.h"

#define S_DATA_SIZE 32
#define S_SOCK_TYPE int

// Linked list management macros
#define LIST_ADD_HEAD(type_, head_, elem_) \
  do {                                     \
    (elem_)->next = (*head_);              \
    *(head_) = (elem_);                    \
  } while (0)

#define LIST_ADD_TAIL(type_, head_, elem_) \
  do {                                     \
    type_ **h = head_;                     \
    while (*h != NULL) h = &(*h)->next;    \
    *h = (elem_);                          \
  } while (0)

#define LIST_DELETE(type_, head_, elem_)   \
  do {                                     \
    type_ **h = head_;                     \
    while (*h != (elem_)) h = &(*h)->next; \
    *h = (elem_)->next;                    \
  } while (0)

/* Адрес */
struct s_addr {
  uint8_t ip[16];
  uint16_t port;
};

/* Менеджер */
struct s_mgr {
  int epoll_fd;
  unsigned long nextid; /* Следующий идентификатор подключения */
  struct s_conn *conns; /* Список активных соединений */

  void *userdata; /* Произвольный указатель пользовательских данных */
  // void *tls_ctx;
  struct s_timer *timers; /* Активные таймеры */
  S_SOCK_TYPE pipe;


  struct m_pack_full packet;
  struct m_state state;
  
  
/* ... */
};

/* Соедниение */
struct s_conn {
  s_event_handler_t
      fn;        /* Указанная пользователем функция обработчика событий */
  void *fn_data; /* Указанный пользователем параметр этой функци */
  s_event_handler_t
      pfn;        /* Протокол-специфическая функция обработчика событий */
  void *pfn_data; /* Протокол-специфический параметр этой функции */
  struct s_conn *next;
  struct s_mgr *mgr;
  struct s_addr local;
  struct s_addr remote;
  void *fd;
  unsigned long id;

  struct s_iobuf recv; /* Входящие данные */
  struct s_iobuf send; /* Исходящие данные */
  // struct s_iobuf prof; /* Данные профиля, включены с помощью MG_ENABLE_PROFILE */
  // struct s_iobuf rtls; /* TLS only. Входящие зашифрованные данные */

  char data[S_DATA_SIZE];
  // void *tls;

  uint32_t update_interval_ms;  /* Персональный интервал (1000, 5000, 10000) */
  time_t last_update_time;      /* Время последнего обновления */

  unsigned is_listening : 1; /* Прослушиваем соединение */
  unsigned is_client : 1;    /* Исходящее (клиентское) соединение */
  unsigned is_accepted : 1;  /* Входящее (серверное) соединение */
  unsigned
      is_resolving : 1; /* Выполнение неблокирующего соединения DNS разрешо */
  unsigned is_connecting : 1; /* Неблокирующее соединение в процессе */
  unsigned is_tls : 1;        /* Подключение с поддержкой TLS */
  unsigned is_tls_hs : 1;     /* TLS handshake в процессе */
  unsigned is_websocket : 1;  /* WebSocket-соединение */
  unsigned is_closing : 1;    /* Закрыть и принудительно удалить соединение */
  unsigned
      is_full : 1; /* Останавить чтение до тех пор, пока оно не будет очищено */
  unsigned is_resp : 1;     /* Ответ все еще генерируется */
  unsigned is_readable : 1; /* Соединение готово к чтению */
  unsigned is_writable : 1; /* Соединение готово к записи  */

  unsigned is_hexdumping : 1;  // Hexdump in/out traffic
  unsigned is_draining : 1;    // Отправить оставшиеся данные, затем закрыть и
                               // освободить память
};

void s_net_mgr_init(struct s_mgr *);
void s_net_mgr_poll(struct s_mgr *, int ms);
void s_net_mgr_free(struct s_mgr *);

struct s_conn *s_net_alloc_conn(struct s_mgr *);
void s_net_close_conn(struct s_conn *);

struct s_conn *s_net_listen(struct s_mgr *, const char *url,
                            s_event_handler_t fn, void *fn_data);
struct s_conn *s_net_connect(struct s_mgr *mgr, const char *url,
                             s_event_handler_t fn, void *fn_data);
struct s_conn *s_net_connect_svc(struct s_mgr *mgr, const char *url,
                                 s_event_handler_t fn, void *fn_data,
                                 s_event_handler_t pfn, void *pfn_data);

struct s_timer *s_net_timer_add(struct s_mgr *, uint64_t ms, unsigned flags,
                                void (*fn)(void *), void *arg);

size_t s_net_printf(struct s_conn *, const char *fmt, ...);
size_t s_net_vprintf(struct s_conn *, const char *fmt, va_list *ap);

#endif  // SRC_S_NET_H