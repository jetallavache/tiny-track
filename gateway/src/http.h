#ifndef TTG_HTTP_H
#define TTG_HTTP_H

#include "common/utils/str.h"
#include "net.h"

#define TTG_MAX_HTTP_HEADERS 30
#define TTG_PATH_MAX 4096

enum { FS_READ = 1, FS_WRITE = 2, FS_DIR = 4 };

/* http-заголовок */
struct ttg_http_header {
  struct tt_util_string name;  /* Название заголовка */
  struct tt_util_string value; /* Значение заголовка */
};

/* http-сообщение */
struct ttg_http_message {
  struct tt_util_string method, uri, query, proto; /* Request/response строка */
  struct ttg_http_header headers[TTG_MAX_HTTP_HEADERS]; /* Заголовки */
  struct tt_util_string body;                           /* Тело запроса */
  struct tt_util_string head;                           /* Запрос + заголовки */
  struct tt_util_string message; /* Запрос + заголовки + тело запроса */
};

/* Параметры для ttg_http_serve_dir() */
struct ttg_http_serve_opts {
  struct tt_util_string root_dir;     // Web root directory, must be non-NULL
  struct tt_util_string ssi_pattern;  // SSI file name pattern, e.g. #.shtml
  struct tt_util_string
      extra_headers;  // Extra HTTP headers to add in responses
  struct tt_util_string
      mime_types;                 // Extra mime types, ext1=type1,ext2=type2,..
  struct tt_util_string page404;  // Path to the 404 page, or NULL by default
  //   struct ttg_fs *fs;           // Filesystem implementation. Use NULL for
  //   POSIX
};

/* Parameter for ttg_http_next_multipart */
// struct ttg_http_part {
//   str_t  name;      // Form field name
//   str_t  filename;  // Filename for file uploads
//   str_t  body;      // Part contents
// };

int ttg_http_parse(const char* s, size_t len, struct ttg_http_message*);
int ttg_http_get_request_len(const unsigned char* buf, size_t buf_len);

// void ttg_http_printf_chunk(struct ttg_conn *cnn, str_t fmt, ...);
// void ttg_http_write_chunk(struct ttg_conn *c, str_t buf, size_t len);
// void ttg_http_delete_chunk(struct ttg_conn *c, struct ttg_http_message *hm);

struct ttg_conn* ttg_http_listen(struct ttg_mgr*, const char* url,
                                 ttg_event_handler_t fn, void* fn_data);
struct ttg_conn* api_http_connect(struct ttg_mgr*, const char* url,
                                  ttg_event_handler_t fn, void* fn_data);

// void ttg_http_serve_dir(struct ttg_conn *, struct ttg_http_message *hm,
//                        const struct ttg_http_serve_opts *);
// void ttg_http_serve_file(struct ttg_conn *, struct ttg_http_message *hm,
//                         str_t path, const struct ttg_http_serve_opts *);

void ttg_http_reply(struct ttg_conn*, int statuttg_code, const char* headers,
                    const char* body_fmt, ...);
struct tt_util_string* ttg_http_get_header(struct ttg_http_message*,
                                           const char* name);

// str_t  ttg_http_var(str_t  buf, str_t  name);
// int ttg_http_get_var(const str_t  *, str_t name, char *, size_t);
// int ttg_url_decode(str_t s, size_t n, char *to, size_t to_len, int form);
// size_t ttg_url_encode(str_t s, size_t n, char *buf, size_t len);
// void ttg_http_creds(struct ttg_http_message *, char *, size_t, char *,
// size_t); long ttg_http_upload(struct ttg_conn *c, struct ttg_http_message
// *hm,
//                     struct ttg_fs *fs, str_t dir, size_t max_size);
// void ttg_http_bauth(struct ttg_conn *, str_t user, str_t pass);
// str_t  ttg_http_get_header_var(str_t  s, str_t  v);
// size_t ttg_http_next_multipart(str_t , size_t, struct ttg_http_part *);

int api_http_status(const struct ttg_http_message* hm);

#endif  // SRC_S_HTTP_H