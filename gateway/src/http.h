#ifndef TTG_HTTP_H
#define TTG_HTTP_H

#include "str.h"
#include "net.h"

#define TTG_MAX_HTTP_HEADERS 30
#define TTG_PATH_MAX 4096

enum { FS_READ = 1, FS_WRITE = 2, FS_DIR = 4 };

struct ttg_http_header {
  struct ttg_str name;  /* Header name */
  struct ttg_str value; /* Header value */
};

struct ttg_http_message {
  struct ttg_str method, uri, query, proto;             /* Request/response line */
  struct ttg_http_header headers[TTG_MAX_HTTP_HEADERS]; /* Headers */
  struct ttg_str body;                                  /* Request body */
  struct ttg_str head;                                  /* Request + headers */
  struct ttg_str message;                               /* Request + headers + request body */
};

struct ttg_http_serve_opts {
  struct ttg_str root_dir;     /* Web root directory, must be non-NULL */
  struct ttg_str ssi_pattern;  /* SSI file name pattern, e.g. #.shtml */
  struct ttg_str
      extra_headers;           /* Extra HTTP headers to add in responses */
  struct ttg_str
      mime_types;              /* Extra mime types, ext1=type1,ext2=type2,.. */
  struct ttg_str page404;      /* Path to the 404 page, or NULL by default */
};

int ttg_http_parse(const char* s, size_t len, struct ttg_http_message*);
int ttg_http_get_request_len(const unsigned char* buf, size_t buf_len);
struct ttg_conn* ttg_http_listen(struct ttg_mgr*, const char* url,
                                 ttg_event_handler fn, void* fn_data);
struct ttg_conn* ttg_http_connect(struct ttg_mgr*, const char* url,
                                  ttg_event_handler fn, void* fn_data);
void ttg_http_reply(struct ttg_conn*, int status_code, const char* headers,
                    const char* body_fmt, ...);
struct ttg_str* ttg_http_get_header(struct ttg_http_message*,
                                           const char* name);
int ttg_http_status(const struct ttg_http_message* hm);

#endif  /* SRC_S_HTTP_H */