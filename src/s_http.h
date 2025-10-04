#ifndef SRC_S_HTTP_H
#define SRC_S_HTTP_H

#include "s_net.h"
#include "str.h"

#define S_MAX_HTTP_HEADERS 30
#define S_PATH_MAX 4096

enum { S_FS_READ = 1, S_FS_WRITE = 2, S_FS_DIR = 4 };

/* http-заголовок */
struct s_http_header {
  struct str_t name;  /* Название заголовка */
  struct str_t value; /* Значение заголовка */
};

/* http-сообщение */
struct s_http_message {
  struct str_t method, uri, query, proto; /* Request/response строка */
  struct s_http_header headers[S_MAX_HTTP_HEADERS]; /* Заголовки */
  struct str_t body;                                /* Тело запроса */
  struct str_t head;                                /* Запрос + заголовки */
  struct str_t message; /* Запрос + заголовки + тело запроса */
};

/* Параметры для s_http_serve_dir() */
struct s_http_serve_opts {
  struct str_t root_dir;       // Web root directory, must be non-NULL
  struct str_t ssi_pattern;    // SSI file name pattern, e.g. #.shtml
  struct str_t extra_headers;  // Extra HTTP headers to add in responses
  struct str_t mime_types;     // Extra mime types, ext1=type1,ext2=type2,..
  struct str_t page404;        // Path to the 404 page, or NULL by default
  //   struct s_fs *fs;           // Filesystem implementation. Use NULL for
  //   POSIX
};

/* Parameter for s_http_next_multipart */
// struct s_http_part {
//   str_t  name;      // Form field name
//   str_t  filename;  // Filename for file uploads
//   str_t  body;      // Part contents
// };

int s_http_parse(const char *s, size_t len, struct s_http_message *);
int s_http_get_request_len(const unsigned char *buf, size_t buf_len);

// void s_http_printf_chunk(struct s_conn *cnn, str_t fmt, ...);
// void s_http_write_chunk(struct s_conn *c, str_t buf, size_t len);
// void s_http_delete_chunk(struct s_conn *c, struct s_http_message *hm);

struct s_conn *s_http_listen(struct s_mgr *, const char *url,
                             s_event_handler_t fn, void *fn_data);
struct s_conn *s_http_connect(struct s_mgr *, const char *url,
                              s_event_handler_t fn, void *fn_data);

// void s_http_serve_dir(struct s_conn *, struct s_http_message *hm,
//                        const struct s_http_serve_opts *);
// void s_http_serve_file(struct s_conn *, struct s_http_message *hm,
//                         str_t path, const struct s_http_serve_opts *);

void s_http_reply(struct s_conn *, int status_code, const char *headers,
                  const char *body_fmt, ...);
struct str_t *s_http_get_header(struct s_http_message *, const char *name);

// str_t  s_http_var(str_t  buf, str_t  name);
// int s_http_get_var(const str_t  *, str_t name, char *, size_t);
// int s_url_decode(str_t s, size_t n, char *to, size_t to_len, int form);
// size_t s_url_encode(str_t s, size_t n, char *buf, size_t len);
// void s_http_creds(struct s_http_message *, char *, size_t, char *, size_t);
// long s_http_upload(struct s_conn *c, struct s_http_message *hm,
//                     struct s_fs *fs, str_t dir, size_t max_size);
// void s_http_bauth(struct s_conn *, str_t user, str_t pass);
// str_t  s_http_get_header_var(str_t  s, str_t  v);
// size_t s_http_next_multipart(str_t , size_t, struct s_http_part *);

int s_http_status(const struct s_http_message *hm);

#endif  // SRC_S_HTTP_H