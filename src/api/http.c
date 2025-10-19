#include "http.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../server/printf.h"

static int ncasecmp(const char* s1, const char* s2, size_t len) {
  int diff = 0;
  if (len > 0) do {
      int c = *s1++, d = *s2++;
      if (c >= 'A' && c <= 'Z') c += 'a' - 'A';
      if (d >= 'A' && d <= 'Z') d += 'a' - 'A';
      diff = c - d;
    } while (diff == 0 && s1[-1] != '\0' && --len > 0);
  return diff;
}

// bool to_size_t(struct str_t str, size_t *val);
// bool to_size_t(struct str_t str, size_t *val) {
//   size_t i = 0, max = (size_t)-1, max2 = max / 10, result = 0, ndigits = 0;
//   while (i < str.len && (str.buf[i] == ' ' || str.buf[i] == '\t')) i++;
//   if (i < str.len && str.buf[i] == '-') return false;
//   while (i < str.len && str.buf[i] >= '0' && str.buf[i] <= '9') {
//     size_t digit = (size_t)(str.buf[i] - '0');
//     if (result > max2) return false;  // Overflow
//     result *= 10;
//     if (result > max - digit) return false;  // Overflow
//     result += digit;
//     i++, ndigits++;
//   }
//   while (i < str.len && (str.buf[i] == ' ' || str.buf[i] == '\t')) i++;
//   if (ndigits == 0) return false;  // #2322: Content-Length = 1 * DIGIT
//   if (i != str.len) return false;  // Ditto
//   *val = (size_t)result;
//   return true;
// }
// // Chunk deletion marker is the MSB in the "processed" counter
// #define MG_DMARK ((size_t)1 << (sizeof(size_t) * 8 - 1))
// // Multipart POST example:
// // --xyz
// // Content-Disposition: form-data; name="val"
// //
// // abcdef
// // --xyz
// // Content-Disposition: form-data; name="foo"; filename="a.txt"
// // Content-Type: text/plain
// //
// // hello world
// //
// // --xyz--
// size_t s_http_next_multipart(struct str_t body, size_t ofs,
//                               struct s_http_part *part) {
//   struct str_t cd = str_t_n("Content-Disposition", 19);
//   const char *s = body.buf;
//   size_t b = ofs, h1, h2, b1, b2, max = body.len;
//   // Init part params
//   if (part != NULL) part->name = part->filename = part->body = str_t_n(0, 0);
//   // Skip boundary
//   while (b + 2 < max && s[b] != '\r' && s[b + 1] != '\n') b++;
//   if (b <= ofs || b + 2 >= max) return 0;
//   // MG_INFO(("B: %zu %zu [%.*s]", ofs, b - ofs, (int) (b - ofs), s));
//   // Skip headers
//   h1 = h2 = b + 2;
//   for (;;) {
//     while (h2 + 2 < max && s[h2] != '\r' && s[h2 + 1] != '\n') h2++;
//     if (h2 == h1) break;
//     if (h2 + 2 >= max) return 0;
//     // MG_INFO(("Header: [%.*s]", (int) (h2 - h1), &s[h1]));
//     if (part != NULL && h1 + cd.len + 2 < h2 && s[h1 + cd.len] == ':' &&
//         ncasecmp(&s[h1], cd.buf, cd.len) == 0) {
//       struct str_t v = str_t_n(&s[h1 + cd.len + 2], h2 - (h1 + cd.len + 2));
//       part->name = s_http_get_header_var(v, str_t_n("name", 4));
//       part->filename = s_http_get_header_var(v, str_t_n("filename", 8));
//     }
//     h1 = h2 = h2 + 2;
//   }
//   b1 = b2 = h2 + 2;
//   while (b2 + 2 + (b - ofs) + 2 < max && !(s[b2] == '\r' && s[b2 + 1] == '\n'
//   &&
//                                            memcmp(&s[b2 + 2], s, b - ofs) ==
//                                            0))
//     b2++;
//   if (b2 + 2 >= max) return 0;
//   if (part != NULL) part->body = str_t_n(&s[b1], b2 - b1);
//   // MG_INFO(("Body: [%.*s]", (int) (b2 - b1), &s[b1]));
//   return b2 + 2;
// }

// void s_http_bauth(struct s_connection *c, const char *user,
//                    const char *pass) {
//   struct str_t u = str_t(user), p = str_t(pass);
//   size_t need = c->send.len + 36 + (u.len + p.len) * 2;
//   if (c->send.size < need) s_iobuf_resize(&c->send, need);
//   if (c->send.size >= need) {
//     size_t i, n = 0;
//     char *buf = (char *)&c->send.buf[c->send.len];
//     memcpy(buf, "Authorization: Basic ", 21);  // DON'T use s_send!
//     for (i = 0; i < u.len; i++) {
//       n = s_base64_update(((unsigned char *)u.buf)[i], buf + 21, n);
//     }
//     if (p.len > 0) {
//       n = s_base64_update(':', buf + 21, n);
//       for (i = 0; i < p.len; i++) {
//         n = s_base64_update(((unsigned char *)p.buf)[i], buf + 21, n);
//       }
//     }
//     n = s_base64_final(buf + 21, n);
//     c->send.len += 21 + (size_t)n + 2;
//     memcpy(&c->send.buf[c->send.len - 2], "\r\n", 2);
//   } else {
//     MG_ERROR(("%lu oom %d->%d ", c->id, (int)c->send.size, (int)need));
//   }
// }

// struct str_t s_http_var(struct str_t buf, struct str_t name) {
//   struct str_t entry, k, v, result = str_t_n(NULL, 0);
//   while (s_span(buf, &entry, &buf, '&')) {
//     if (s_span(entry, &k, &v, '=') && name.len == k.len &&
//         ncasecmp(name.buf, k.buf, k.len) == 0) {
//       result = v;
//       break;
//     }
//   }
//   return result;
// }

// int s_http_get_var(const struct str_t *buf, const char *name, char *dst,
//                     size_t dst_len) {
//   int len;
//   if (dst != NULL && dst_len > 0) {
//     dst[0] = '\0';  // If destination buffer is valid, always nul-terminate
//     it
//   }
//   if (dst == NULL || dst_len == 0) {
//     len = -2;  // Bad destination
//   } else if (buf->buf == NULL || name == NULL || buf->len == 0) {
//     len = -1;  // Bad source
//   } else {
//     struct str_t v = s_http_var(*buf, str_t(name));
//     if (v.buf == NULL) {
//       len = -4;  // Name does not exist
//     } else {
//       len = s_url_decode(v.buf, v.len, dst, dst_len, 1);
//       if (len < 0) len = -3;  // Failed to decode
//     }
//   }
//   return len;
// }

// static bool isx(int c) {
//   return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') ||
//          (c >= 'A' && c <= 'F');
// }

// int s_url_decode(const char *src, size_t src_len, char *dst, size_t dst_len,
//                   int is_form_url_encoded) {
//   size_t i, j;
//   for (i = j = 0; i < src_len && j + 1 < dst_len; i++, j++) {
//     if (src[i] == '%') {
//       // Use `i + 2 < src_len`, not `i < src_len - 2`, note small src_len
//       if (i + 2 < src_len && isx(src[i + 1]) && isx(src[i + 2])) {
//         str_t_to_num(str_t_n(src + i + 1, 2), 16, &dst[j], sizeof(uint8_t));
//         i += 2;
//       } else {
//         return -1;
//       }
//     } else if (is_form_url_encoded && src[i] == '+') {
//       dst[j] = ' ';
//     } else {
//       dst[j] = src[i];
//     }
//   }
//   if (j < dst_len) dst[j] = '\0';  // Null-terminate the destination
//   return i >= src_len && j < dst_len ? (int)j : -1;
// }

static bool isok(uint8_t c) {
  return c == '\n' || c == '\r' || c == '\t' || c >= ' ';
}

int api_http_get_request_len(const unsigned char* buf, size_t buf_len) {
  size_t i;
  for (i = 0; i < buf_len; i++) {
    if (!isok(buf[i])) return -1;
    if ((i > 0 && buf[i] == '\n' && buf[i - 1] == '\n') ||
        (i > 3 && buf[i] == '\n' && buf[i - 1] == '\r' && buf[i - 2] == '\n'))
      return (int)i + 1;
  }
  return 0;
}

struct str_t* api_http_get_header(struct api_http_message* h,
                                  const char* name) {
  size_t i, n = strlen(name), max = sizeof(h->headers) / sizeof(h->headers[0]);
  for (i = 0; i < max && h->headers[i].name.len > 0; i++) {
    struct str_t *k = &h->headers[i].name, *v = &h->headers[i].value;
    if (n == k->len && ncasecmp(k->buf, name, n) == 0) return v;
  }
  return NULL;
}

/* Это действительный байт продолжения UTF-8 */
static bool vcb(uint8_t c) { return (c & 0xc0) == 0x80; }

/* Получить длину символа (действительный UTF-8). Используется для анализа
 * метода, URI, заголовки*/
static size_t clen(const char* s, const char* end) {
  const unsigned char *u = (unsigned char*)s, c = *u;
  long n = (long)(end - s);
  if (c > ' ' && c <= '~') return 1;  // Usual ascii printed char
  if ((c & 0xe0) == 0xc0 && n > 1 && vcb(u[1])) return 2;  // 2-byte UTF8
  if ((c & 0xf0) == 0xe0 && n > 2 && vcb(u[1]) && vcb(u[2])) return 3;
  if ((c & 0xf8) == 0xf0 && n > 3 && vcb(u[1]) && vcb(u[2]) && vcb(u[3]))
    return 4;
  return 0;
}

/* Пропускать до новой строки. Возвращать расширенную букву "s" или значение
 * NULL в случае ошибки */
static const char* skiptorn(const char* s, const char* end, struct str_t* v) {
  v->buf = (char*)s;
  while (s < end && s[0] != '\n' && s[0] != '\r') s++, v->len++;  // To newline
  if (s >= end || (s[0] == '\r' && s[1] != '\n')) return NULL;    // Stray \r
  if (s < end && s[0] == '\r') s++;                               // Skip \r
  if (s >= end || *s++ != '\n') return NULL;                      // Skip \n
  return s;
}

static bool s_http_parse_headers(const char* s, const char* end,
                                 struct api_http_header* h, size_t max_hdrs) {
  size_t i, n;
  for (i = 0; i < max_hdrs; i++) {
    struct str_t k = {NULL, 0}, v = {NULL, 0};
    if (s >= end) return false;
    if (s[0] == '\n' || (s[0] == '\r' && s[1] == '\n')) break;
    k.buf = (char*)s;
    while (s < end && s[0] != ':' && (n = clen(s, end)) > 0) s += n, k.len += n;
    if (k.len == 0) return false;                     // Empty name
    if (s >= end || clen(s, end) == 0) return false;  // Invalid UTF-8
    if (*s++ != ':') return false;  // Invalid, not followed by :
    // if (clen(s, end) == 0) return false;        // Invalid UTF-8
    while (s < end && (s[0] == ' ' || s[0] == '\t')) s++;  // Skip spaces
    if ((s = skiptorn(s, end, &v)) == NULL) return false;
    while (v.len > 0 && (v.buf[v.len - 1] == ' ' || v.buf[v.len - 1] == '\t')) {
      v.len--;  // Trim spaces
    }
    // L_INFO(("--HH [%.*s] [%.*s]", (int)k.len, k.buf, (int)v.len, v.buf));
    h[i].name = k, h[i].value = v;  // Success. Assign values
  }
  return true;
}

// bool to_size_t(struct mg_str str, size_t *val);
bool to_size_t(struct str_t str, size_t* val) {
  size_t i = 0, max = (size_t)-1, max2 = max / 10, result = 0, ndigits = 0;
  while (i < str.len && (str.buf[i] == ' ' || str.buf[i] == '\t')) i++;
  if (i < str.len && str.buf[i] == '-') return false;
  while (i < str.len && str.buf[i] >= '0' && str.buf[i] <= '9') {
    size_t digit = (size_t)(str.buf[i] - '0');
    if (result > max2) return false;  // Overflow
    result *= 10;
    if (result > max - digit) return false;  // Overflow
    result += digit;
    i++, ndigits++;
  }
  while (i < str.len && (str.buf[i] == ' ' || str.buf[i] == '\t')) i++;
  if (ndigits == 0) return false;  // #2322: Content-Length = 1 * DIGIT
  if (i != str.len) return false;  // Ditto
  *val = (size_t)result;
  return true;
}

int api_http_parse(const char* s, size_t len, struct api_http_message* hm) {
  int is_response, req_len = api_http_get_request_len((unsigned char*)s, len);
  const char *end = s == NULL ? NULL : s + req_len, *qs;
  const struct str_t* cl;
  size_t n;
  bool version_prefix_valid;

  memset(hm, 0, sizeof(*hm));
  if (req_len <= 0) return req_len;

  hm->message.buf = hm->head.buf = (char*)s;
  hm->body.buf = (char*)end;
  hm->head.len = (size_t)req_len;
  hm->message.len = hm->body.len = (size_t)-1;

  hm->method.buf = (char*)s;
  while (s < end && (n = clen(s, end)) > 0) s += n, hm->method.len += n;
  while (s < end && s[0] == ' ') s++;
  hm->uri.buf = (char*)s;
  while (s < end && (n = clen(s, end)) > 0) s += n, hm->uri.len += n;
  while (s < end && s[0] == ' ') s++;
  is_response =
      hm->method.len > 5 && (ncasecmp(hm->method.buf, "HTTP/", 5) == 0);
  if ((s = skiptorn(s, end, &hm->proto)) == NULL) return false;
  // If we're given a version, check that it is HTTP/x.x
  version_prefix_valid =
      hm->proto.len > 5 && (ncasecmp(hm->proto.buf, "HTTP/", 5) == 0);
  if (!is_response && hm->proto.len > 0 &&
      (!version_prefix_valid || hm->proto.len != 8 ||
       (hm->proto.buf[5] < '0' || hm->proto.buf[5] > '9') ||
       (hm->proto.buf[6] != '.') ||
       (hm->proto.buf[7] < '0' || hm->proto.buf[7] > '9'))) {
    return -1;
  }

  // If URI contains '?' character, setup query string
  if ((qs = (const char*)memchr(hm->uri.buf, '?', hm->uri.len)) != NULL) {
    hm->query.buf = (char*)qs + 1;
    hm->query.len = (size_t)(&hm->uri.buf[hm->uri.len] - (qs + 1));
    hm->uri.len = (size_t)(qs - hm->uri.buf);
  }

  // Sanity check. Allow protocol/reason to be empty
  // Do this check after hm->method.len and hm->uri.len are finalised
  if (hm->method.len == 0 || hm->uri.len == 0) return -1;

  if (!s_http_parse_headers(s, end, hm->headers,
                            sizeof(hm->headers) / sizeof(hm->headers[0])))
    return -1;  // error when parsing
  if ((cl = api_http_get_header(hm, "Content-Length")) != NULL) {
    if (to_size_t(*cl, &hm->body.len) == false) return -1;
    hm->message.len = (size_t)req_len + hm->body.len;
  }

  if (hm->body.len == (size_t)~0 && !is_response &&
      str_casecmp(hm->method, str("PUT")) != 0 &&
      str_casecmp(hm->method, str("POST")) != 0) {
    hm->body.len = 0;
    hm->message.len = (size_t)req_len;
  }

  if (hm->body.len == (size_t)~0 && is_response &&
      str_casecmp(hm->uri, str("204")) == 0) {
    hm->body.len = 0;
    hm->message.len = (size_t)req_len;
  }
  if (hm->message.len < (size_t)req_len) return -1;  // Overflow protection

  return req_len;
}

// static void s_http_vprintf_chunk(struct s_connection *c, const char *fmt,
//                                   va_list *ap) {
//   size_t len = c->send.len;
//   s_send(c, "        \r\n", 10);
//   s_vxprintf(s_pfn_iobuf, &c->send, fmt, ap);
//   if (c->send.len >= len + 10) {
//     snprintf((char *)c->send.buf + len, 9, "%08lx", c->send.len - len - 10);
//     c->send.buf[len + 8] = '\r';
//     if (c->send.len == len + 10) c->is_resp = 0;  // Last chunk, reset marker
//   }
//   s_send(c, "\r\n", 2);
// }

// void s_http_printf_chunk(struct s_connection *c, const char *fmt, ...) {
//   va_list ap;
//   va_start(ap, fmt);
//   s_http_vprintf_chunk(c, fmt, &ap);
//   va_end(ap);
// }

// void s_http_write_chunk(struct s_connection *c, const char *buf, size_t len)
// {
//   s_net_printf(c, "%lx\r\n", (unsigned long)len);
//   s_send(c, buf, len);
//   s_send(c, "\r\n", 2);
//   if (len == 0) c->is_resp = 0;
// }

static const char* s_http_status_code_str(int status_code) {
  switch (status_code) {
    case 100:
      return "Continue";
    case 101:
      return "Switching Protocols";
    case 102:
      return "Processing";
    case 200:
      return "OK";
    case 201:
      return "Created";
    case 202:
      return "Accepted";
    case 203:
      return "Non-authoritative Information";
    case 204:
      return "No Content";
    case 205:
      return "Reset Content";
    case 206:
      return "Partial Content";
    case 207:
      return "Multi-Status";
    case 208:
      return "Already Reported";
    case 226:
      return "IM Used";
    case 300:
      return "Multiple Choices";
    case 301:
      return "Moved Permanently";
    case 302:
      return "Found";
    case 303:
      return "See Other";
    case 304:
      return "Not Modified";
    case 305:
      return "Use Proxy";
    case 307:
      return "Temporary Redirect";
    case 308:
      return "Permanent Redirect";
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 402:
      return "Payment Required";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 405:
      return "Method Not Allowed";
    case 406:
      return "Not Acceptable";
    case 407:
      return "Proxy Authentication Required";
    case 408:
      return "Request Timeout";
    case 409:
      return "Conflict";
    case 410:
      return "Gone";
    case 411:
      return "Length Required";
    case 412:
      return "Precondition Failed";
    case 413:
      return "Payload Too Large";
    case 414:
      return "Request-URI Too Long";
    case 415:
      return "Unsupported Media Type";
    case 416:
      return "Requested Range Not Satisfiable";
    case 417:
      return "Expectation Failed";
    case 418:
      return "I'm a teapot";
    case 421:
      return "Misdirected Request";
    case 422:
      return "Unprocessable Entity";
    case 423:
      return "Locked";
    case 424:
      return "Failed Dependency";
    case 426:
      return "Upgrade Required";
    case 428:
      return "Precondition Required";
    case 429:
      return "Too Many Requests";
    case 431:
      return "Request Header Fields Too Large";
    case 444:
      return "Connection Closed Without Response";
    case 451:
      return "Unavailable For Legal Reasons";
    case 499:
      return "Client Closed Request";
    case 500:
      return "Internal Server Error";
    case 501:
      return "Not Implemented";
    case 502:
      return "Bad Gateway";
    case 503:
      return "Service Unavailable";
    case 504:
      return "Gateway Timeout";
    case 505:
      return "HTTP Version Not Supported";
    case 506:
      return "Variant Also Negotiates";
    case 507:
      return "Insufficient Storage";
    case 508:
      return "Loop Detected";
    case 510:
      return "Not Extended";
    case 511:
      return "Network Authentication Required";
    case 599:
      return "Network Connect Timeout Error";
    default:
      return "";
  }
}

void api_http_reply(struct s_conn* c, int code, const char* headers,
                    const char* fmt, ...) {
  va_list ap;
  size_t len;
  s_net_printf(c, "HTTP/1.1 %d %s\r\n%sContent-Length:            \r\n\r\n",
               code, s_http_status_code_str(code),
               headers == NULL ? "" : headers);
  len = c->send.len;
  va_start(ap, fmt);
  s_vxprintf(s_pfn_iobuf, &c->send, fmt, &ap);
  va_end(ap);
  if (c->send.len > 16) {
    size_t n = snprintf((char*)&c->send.buf[len - 15], 11, "%-10lu",
                        (unsigned long)(c->send.len - len));
    c->send.buf[len - 15 + n] = ' '; /* Change ending 0 to space */
  }
  c->is_resp = 0;
}

// static void http_cb(struct s_connection *, int, void *);
// static void restore_http_cb(struct s_connection *c) {
//   s_fs_close((struct s_fd *)c->pfn_data);
//   c->pfn_data = NULL;
//   c->pfn = http_cb;
//   c->is_resp = 0;
// }

// char *s_http_etag(char *buf, size_t len, size_t size, time_t mtime);
// char *s_http_etag(char *buf, size_t len, size_t size, time_t mtime) {
//   snprintf(buf, len, "\"%lld.%lld\"", (int64_t)mtime, (int64_t)size);
//   return buf;
// }

// static void static_cb(struct s_connection *c, int ev, void *ev_data) {
//   if (ev == S_EVENT_WRITE || ev == S_EVENT_POLL) {
//     struct s_fd *fd = (struct s_fd *)c->pfn_data;
//     // Read to send IO buffer directly, avoid extra on-stack buffer
//     size_t n, max = MG_IO_SIZE, space;
//     size_t *cl = (size_t *)&c->data[(sizeof(c->data) - sizeof(size_t)) /
//                                     sizeof(size_t) * sizeof(size_t)];
//     if (c->send.size < max) s_iobuf_resize(&c->send, max);
//     if (c->send.len >= c->send.size) return;  // Rate limit
//     if ((space = c->send.size - c->send.len) > *cl) space = *cl;
//     n = fd->fs->rd(fd->fd, c->send.buf + c->send.len, space);
//     c->send.len += n;
//     *cl -= n;
//     if (n == 0) restore_http_cb(c);
//   } else if (ev == S_EVENT_CLOSE) {
//     restore_http_cb(c);
//   }
//   (void)ev_data;
// }

// // Known mime types. Keep it outside guess_content_type() function, since
// // some environments don't like it defined there.
// // clang-format off
// #define MG_C_STR(a) { (char *) (a), sizeof(a) - 1 }
// static struct str_t s_known_types[] = {
//     MG_C_STR("html"), MG_C_STR("text/html; charset=utf-8"),
//     MG_C_STR("htm"), MG_C_STR("text/html; charset=utf-8"),
//     MG_C_STR("css"), MG_C_STR("text/css; charset=utf-8"),
//     MG_C_STR("js"), MG_C_STR("text/javascript; charset=utf-8"),
//     MG_C_STR("mjs"), MG_C_STR("text/javascript; charset=utf-8"),
//     MG_C_STR("gif"), MG_C_STR("image/gif"),
//     MG_C_STR("png"), MG_C_STR("image/png"),
//     MG_C_STR("jpg"), MG_C_STR("image/jpeg"),
//     MG_C_STR("jpeg"), MG_C_STR("image/jpeg"),
//     MG_C_STR("woff"), MG_C_STR("font/woff"),
//     MG_C_STR("ttf"), MG_C_STR("font/ttf"),
//     MG_C_STR("svg"), MG_C_STR("image/svg+xml"),
//     MG_C_STR("txt"), MG_C_STR("text/plain; charset=utf-8"),
//     MG_C_STR("avi"), MG_C_STR("video/x-msvideo"),
//     MG_C_STR("csv"), MG_C_STR("text/csv"),
//     MG_C_STR("doc"), MG_C_STR("application/msword"),
//     MG_C_STR("exe"), MG_C_STR("application/octet-stream"),
//     MG_C_STR("gz"), MG_C_STR("application/gzip"),
//     MG_C_STR("ico"), MG_C_STR("image/x-icon"),
//     MG_C_STR("json"), MG_C_STR("application/json"),
//     MG_C_STR("mov"), MG_C_STR("video/quicktime"),
//     MG_C_STR("mp3"), MG_C_STR("audio/mpeg"),
//     MG_C_STR("mp4"), MG_C_STR("video/mp4"),
//     MG_C_STR("mpeg"), MG_C_STR("video/mpeg"),
//     MG_C_STR("pdf"), MG_C_STR("application/pdf"),
//     MG_C_STR("shtml"), MG_C_STR("text/html; charset=utf-8"),
//     MG_C_STR("tgz"), MG_C_STR("application/tar-gz"),
//     MG_C_STR("wav"), MG_C_STR("audio/wav"),
//     MG_C_STR("webp"), MG_C_STR("image/webp"),
//     MG_C_STR("zip"), MG_C_STR("application/zip"),
//     MG_C_STR("3gp"), MG_C_STR("video/3gpp"),
//     {0, 0},
// };
// // clang-format on

// static struct str_t guess_content_type(struct str_t path, const char *extra)
// {
//   struct str_t entry, k, v, s = str_t(extra), asterisk = str_t_n("*", 1);
//   size_t i = 0;
//   // Shrink path to its extension only
//   while (i < path.len && path.buf[path.len - i - 1] != '.') i++;
//   path.buf += path.len - i;
//   path.len = i;
//   // Process user-provided mime type overrides, if any
//   while (s_span(s, &entry, &s, ',')) {
//     if (s_span(entry, &k, &v, '=') &&
//         (str_tcmp(asterisk, k) == 0 || str_tcmp(path, k) == 0))
//       return v;
//   }
//   // Process built-in mime types
//   for (i = 0; s_known_types[i].buf != NULL; i += 2) {
//     if (str_tcmp(path, s_known_types[i]) == 0) return s_known_types[i + 1];
//   }
//   return str_t("text/plain; charset=utf-8");
// }

// static int getrange(struct str_t *s, size_t *a, size_t *b) {
//   size_t i, numparsed = 0;
//   for (i = 0; i + 6 < s->len; i++) {
//     struct str_t k, v = str_t_n(s->buf + i + 6, s->len - i - 6);
//     if (memcmp(&s->buf[i], "bytes=", 6) != 0) continue;
//     if (s_span(v, &k, &v, '-')) {
//       if (to_size_t(k, a)) numparsed++;
//       if (v.len > 0 && to_size_t(v, b)) numparsed++;
//     } else {
//       if (to_size_t(v, a)) numparsed++;
//     }
//     break;
//   }
//   return (int)numparsed;
// }

// void s_http_serve_file(struct s_connection *c, struct api_http_message *hm,
//                         const char *path,
//                         const struct api_http_serve_opts *opts) {
//   char etag[64], tmp[MG_PATH_MAX];
//   struct s_fs *fs = opts->fs == NULL ? &s_fs_posix : opts->fs;
//   struct s_fd *fd = NULL;
//   size_t size = 0;
//   time_t mtime = 0;
//   struct str_t *inm = NULL;
//   struct str_t mime = guess_content_type(str_t(path), opts->mime_types);
//   bool gzip = false;
//   if (path != NULL) {
//     // If a browser sends us "Accept-Encoding: gzip", try to open .gz first
//     struct str_t *ae = api_http_get_header(hm, "Accept-Encoding");
//     if (ae != NULL) {
//       if (s_match(*ae, str_t("*gzip*"), NULL)) {
//         snprintf(tmp, sizeof(tmp), "%s.gz", path);
//         fd = s_fs_open(fs, tmp, MG_FS_READ);
//         if (fd != NULL) gzip = true, path = tmp;
//       }
//     }
//     // No luck opening .gz? Open what we've told to open
//     if (fd == NULL) fd = s_fs_open(fs, path, MG_FS_READ);
//   }
//   // Failed to open, and page404 is configured? Open it, then
//   if (fd == NULL && opts->page404 != NULL) {
//     fd = s_fs_open(fs, opts->page404, MG_FS_READ);
//     path = opts->page404;
//     mime = guess_content_type(str_t(path), opts->mime_types);
//   }
//   if (fd == NULL || fs->st(path, &size, &mtime) == 0) {
//     api_http_reply(c, 404, opts->extra_headers, "Not found\n");
//     s_fs_close(fd);
//     // NOTE: s_http_etag() call should go first!
//   } else if (s_http_etag(etag, sizeof(etag), size, mtime) != NULL &&
//              (inm = api_http_get_header(hm, "If-None-Match")) != NULL &&
//              str_tcasecmp(*inm, str_t(etag)) == 0) {
//     s_fs_close(fd);
//     api_http_reply(c, 304, opts->extra_headers, "");
//   } else {
//     int n, status = 200;
//     char range[100];
//     size_t r1 = 0, r2 = 0, cl = size;
//     // Handle Range header
//     struct str_t *rh = api_http_get_header(hm, "Range");
//     range[0] = '\0';
//     if (rh != NULL && (n = getrange(rh, &r1, &r2)) > 0) {
//       // If range is specified like "400-", set second limit to content len
//       if (n == 1) r2 = cl - 1;
//       if (r1 > r2 || r2 >= cl) {
//         status = 416;
//         cl = 0;
//         snprintf(range, sizeof(range), "Content-Range: bytes */%lld\r\n",
//                     (int64_t)size);
//       } else {
//         status = 206;
//         cl = r2 - r1 + 1;
//         snprintf(range, sizeof(range),
//                     "Content-Range: bytes %llu-%llu/%llu\r\n", (uint64_t)r1,
//                     (uint64_t)(r1 + cl - 1), (uint64_t)size);
//         fs->sk(fd->fd, r1);
//       }
//     }
//     s_net_printf(c,
//               "HTTP/1.1 %d %s\r\n"
//               "Content-Type: %.*s\r\n"
//               "Etag: %s\r\n"
//               "Content-Length: %llu\r\n"
//               "%s%s%s\r\n",
//               status, s_http_status_code_str(status), (int)mime.len,
//               mime.buf, etag, (uint64_t)cl, gzip ? "Content-Encoding:
//               gzip\r\n" : "", range, opts->extra_headers ?
//               opts->extra_headers : "");
//     if (str_tcasecmp(hm->method, str_t("HEAD")) == 0) {
//       c->is_resp = 0;
//       s_fs_close(fd);
//     } else {
//       // Track to-be-sent content length at the end of c->data, aligned
//       size_t *clp = (size_t *)&c->data[(sizeof(c->data) - sizeof(size_t)) /
//                                        sizeof(size_t) * sizeof(size_t)];
//       c->pfn = static_cb;
//       c->pfn_data = fd;
//       *clp = cl;
//     }
//   }
// }

// struct printdirentrydata {
//   struct s_connection *c;
//   struct api_http_message *hm;
//   const struct api_http_serve_opts *opts;
//   const char *dir;
// };

// // Resolve requested file into `path` and return its fs->st() result
// static int uri_to_path2(struct s_conn *c, struct api_http_message *hm,
//                         struct s_fs *fs, struct str_t url, struct str_t dir,
//                         char *path, size_t path_size) {
//   int flags, tmp;
//   // Append URI to the root_dir, and sanitize it
//   size_t n = snprintf(path, path_size, "%.*s", (int)dir.len, dir.buf);
//   if (n + 2 >= path_size) {
//     api_http_reply(c, 400, "", "Exceeded path size");
//     return -1;
//   }
//   path[path_size - 1] = '\0';
//   // Terminate root dir with slash
//   if (n > 0 && path[n - 1] != '/') path[n++] = '/', path[n] = '\0';
//   if (url.len < hm->uri.len) {
//     s_url_decode(hm->uri.buf + url.len, hm->uri.len - url.len, path + n,
//                   path_size - n, 0);
//   }
//   path[path_size - 1] = '\0';  // Double-check
//   if (!s_path_is_sane(str_t_n(path, path_size))) {
//     api_http_reply(c, 400, "", "Invalid path");
//     return -1;
//   }
//   n = strlen(path);
//   while (n > 1 && path[n - 1] == '/') path[--n] = 0;  // Trim trailing
//   slashes flags = str_tcmp(hm->uri, str_t("/")) == 0 ? MG_FS_DIR
//                                                : fs->st(path, NULL, NULL);
//   L_VERBOSE(
//       ("%lu %.*s -> %s %d", c->id, (int)hm->uri.len, hm->uri.buf, path,
//       flags));
//   if (flags == 0) {
//     // Do nothing - let's caller decide
//   } else if ((flags & MG_FS_DIR) && hm->uri.len > 0 &&
//              hm->uri.buf[hm->uri.len - 1] != '/') {
//     s_net_printf(c,
//               "HTTP/1.1 301 Moved\r\n"
//               "Location: %.*s/\r\n"
//               "Content-Length: 0\r\n"
//               "\r\n",
//               (int)hm->uri.len, hm->uri.buf);
//     c->is_resp = 0;
//     flags = -1;
//   } else if (flags & MG_FS_DIR) {
//     if (((snprintf(path + n, path_size - n, "/" MG_HTTP_INDEX) > 0 &&
//           (tmp = fs->st(path, NULL, NULL)) != 0) ||
//          (snprintf(path + n, path_size - n, "/index.shtml") > 0 &&
//           (tmp = fs->st(path, NULL, NULL)) != 0))) {
//       flags = tmp;
//     } else if ((snprintf(path + n, path_size - n, "/" MG_HTTP_INDEX ".gz") >
//                     0 &&
//                 (tmp = fs->st(path, NULL, NULL)) !=
//                     0)) {  // check for gzipped index
//       flags = tmp;
//       path[n + 1 + strlen(MG_HTTP_INDEX)] =
//           '\0';  // Remove appended .gz in index file name
//     } else {
//       path[n] = '\0';  // Remove appended index file name
//     }
//   }
//   return flags;
// }

// static int uri_to_path(struct s_conn *c, struct api_http_message *hm,
//                        const struct api_http_serve_opts *opts, char *path,
//                        size_t path_size) {
//   struct s_fs *fs = opts->fs == NULL ? &s_fs_posix : opts->fs;
//   struct str_t k, v, part, s = str_t(opts->root_dir), u = {NULL, 0}, p = u;
//   while (s_span(s, &part, &s, ',')) {
//     if (!s_span(part, &k, &v, '=')) k = part, v = str_t_n(NULL, 0);
//     if (v.len == 0) v = k, k = str_t("/"), u = k, p = v;
//     if (hm->uri.len < k.len) continue;
//     if (str_tcmp(k, str_t_n(hm->uri.buf, k.len)) != 0) continue;
//     u = k, p = v;
//   }
//   return uri_to_path2(c, hm, fs, u, p, path, path_size);
// }

// void s_http_serve_dir(struct s_conn *c, struct api_http_message *hm,
//                        const struct api_http_serve_opts *opts) {
//   char path[S_PATH_MAX];
// //   const char *sp = opts->ssi_pattern;
//   int flags = uri_to_path(c, hm, opts, path, sizeof(path));
//   if (flags < 0) {
//     // Do nothing: the response has already been sent by uri_to_path()
//   } else if (flags & S_FS_DIR) {
//     api_http_reply(c, 403, "", "Forbidden\n");
// //   } else if (flags && sp != NULL && s_match(str_t(path), str_t(sp), NULL))
// {
// //     s_http_serve_ssi(c, opts->root_dir, path);
//   } else {
//     s_http_serve_file(c, hm, path, opts);
//   }
// }

// static bool s_is_url_safe(int c) {
//   return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') ||
//          (c >= 'A' && c <= 'Z') || c == '.' || c == '_' || c == '-' || c ==
//          '~';
// }

// size_t s_url_encode(const char *s, size_t sl, char *buf, size_t len) {
//   size_t i, n = 0;
//   for (i = 0; i < sl; i++) {
//     int c = *(unsigned char *)&s[i];
//     if (n + 4 >= len) return 0;
//     if (s_is_url_safe(c)) {
//       buf[n++] = s[i];
//     } else {
//       snprintf(&buf[n], 4, "%%%M", s_print_hex, 1, &s[i]);
//       n += 3;
//     }
//   }
//   if (len > 0 && n < len - 1) buf[n] = '\0';  // Null-terminate the
//   destination if (len > 0) buf[len - 1] = '\0';           // Always. return
//   n;
// }

// void s_http_creds(struct api_http_message *hm, char *user, size_t userlen,
//                    char *pass, size_t passlen) {
//   struct str_t *v = api_http_get_header(hm, "Authorization");
//   user[0] = pass[0] = '\0';
//   if (v != NULL && v->len > 6 && memcmp(v->buf, "Basic ", 6) == 0) {
//     char buf[256];
//     size_t n = s_base64_decode(v->buf + 6, v->len - 6, buf, sizeof(buf));
//     const char *p = (const char *)memchr(buf, ':', n > 0 ? n : 0);
//     if (p != NULL) {
//       snprintf(user, userlen, "%.*s", p - buf, buf);
//       snprintf(pass, passlen, "%.*s", n - (size_t)(p - buf) - 1, p + 1);
//     }
//   } else if (v != NULL && v->len > 7 && memcmp(v->buf, "Bearer ", 7) == 0) {
//     snprintf(pass, passlen, "%.*s", (int)v->len - 7, v->buf + 7);
//   } else if ((v = api_http_get_header(hm, "Cookie")) != NULL) {
//     struct str_t t = s_http_get_header_var(*v, str_t_n("access_token", 12));
//     if (t.len > 0) snprintf(pass, passlen, "%.*s", (int)t.len, t.buf);
//   } else {
//     s_http_get_var(&hm->query, "access_token", pass, passlen);
//   }
// }

// static struct str_t stripquotes(struct str_t s) {
//   return s.len > 1 && s.buf[0] == '"' && s.buf[s.len - 1] == '"'
//              ? str_t_n(s.buf + 1, s.len - 2)
//              : s;
// }

// struct str_t s_http_get_header_var(struct str_t s, struct str_t v) {
//   size_t i;
//   for (i = 0; v.len > 0 && i + v.len + 2 < s.len; i++) {
//     if (s.buf[i + v.len] == '=' && memcmp(&s.buf[i], v.buf, v.len) == 0) {
//       const char *p = &s.buf[i + v.len + 1], *b = p, *x = &s.buf[s.len];
//       int q = p < x && *p == '"' ? 1 : 0;
//       while (p < x &&
//              (q ? p == b || *p != '"' : *p != ';' && *p != ' ' && *p != ','))
//         p++;
//       // MG_INFO(("[%.*s] [%.*s] [%.*s]", (int) s.len, s.buf, (int) v.len,
//       // v.buf, (int) (p - b), b));
//       return stripquotes(str_t_n(b, (size_t)(p - b + q)));
//     }
//   }
//   return str_t_n(NULL, 0);
// }

// long s_http_upload(struct s_connection *c, struct api_http_message *hm,
//                     struct s_fs *fs, const char *dir, size_t max_size) {
//   char buf[20] = "0", file[MG_PATH_MAX], path[MG_PATH_MAX];
//   long res = 0, offset;
//   s_http_get_var(&hm->query, "offset", buf, sizeof(buf));
//   s_http_get_var(&hm->query, "file", file, sizeof(file));
//   offset = strtol(buf, NULL, 0);
//   snprintf(path, sizeof(path), "%s%c%s", dir, MG_DIRSEP, file);
//   if (hm->body.len == 0) {
//     api_http_reply(c, 200, "", "%ld", res);  // Nothing to write
//   } else if (file[0] == '\0') {
//     api_http_reply(c, 400, "", "file required");
//     res = -1;
//   } else if (s_path_is_sane(str_t(file)) == false) {
//     api_http_reply(c, 400, "", "%s: invalid file", file);
//     res = -2;
//   } else if (offset < 0) {
//     api_http_reply(c, 400, "", "offset required");
//     res = -3;
//   } else if ((size_t)offset + hm->body.len > max_size) {
//     api_http_reply(c, 400, "", "%s: over max size of %lu", path,
//                   (unsigned long)max_size);
//     res = -4;
//   } else {
//     struct s_fd *fd;
//     size_t current_size = 0;
//     MG_DEBUG(("%s -> %lu bytes @ %ld", path, hm->body.len, offset));
//     if (offset == 0) fs->rm(path);  // If offset if 0, truncate file
//     fs->st(path, &current_size, NULL);
//     if (offset > 0 && current_size != (size_t)offset) {
//       api_http_reply(c, 400, "", "%s: offset mismatch", path);
//       res = -5;
//     } else if ((fd = s_fs_open(fs, path, MG_FS_WRITE)) == NULL) {
//       api_http_reply(c, 400, "", "open(%s)", path);
//       res = -6;
//     } else {
//       res = offset + (long)fs->wr(fd->fd, hm->body.buf, hm->body.len);
//       s_fs_close(fd);
//       api_http_reply(c, 200, "", "%ld", res);
//     }
//   }
//   return res;
// }

int api_http_status(const struct api_http_message* hm) {
  return atoi(hm->uri.buf);
}

static bool is_hex_digit(int c) {
  return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') ||
         (c >= 'A' && c <= 'F');
}

static int skip_chunk(const char* buf, int len, int* pl, int* dl) {
  int i = 0, n = 0;
  if (len < 3) return 0;
  while (i < len && is_hex_digit(buf[i])) i++;
  if (i == 0) return -1;                    // Error, no length specified
  if (i > (int)sizeof(int) * 2) return -1;  // Chunk length is too big
  if (len < i + 1 || buf[i] != '\r' || buf[i + 1] != '\n') return -1;  // Error
  if (str_to_num(str_n(buf, (size_t)i), 16, &n, sizeof(int)) == false)
    return -1;                    // Decode chunk length, overflow
  if (n < 0) return -1;           // Error. TODO(): some checks now redundant
  if (n > len - i - 4) return 0;  // Chunk not yet fully buffered
  if (buf[i + n + 2] != '\r' || buf[i + n + 3] != '\n') return -1;  // Error
  *pl = i + 2, *dl = n;
  return i + 2 + n + 2;
}

static void http_cb(struct s_conn* c, int ev, void* ev_data) {
  if (ev == S_EVENT_READ || ev == S_EVENT_CLOSE ||
      (ev == S_EVENT_POLL && c->is_accepted && !c->is_draining &&
       c->recv.len > 0)) {
    struct api_http_message hm;
    size_t ofs = 0;  // Parsing offset

    while (c->is_resp == 0 && ofs < c->recv.len) {
      const char* buf = (char*)c->recv.buf + ofs;
      int n = api_http_parse(buf, c->recv.len - ofs, &hm);
      struct str_t* te;  // Transfer - encoding header
      bool is_chunked = false;
      size_t old_len = c->recv.len;

      if (n < 0) {
        // We don't use s_error() here, to avoid closing pipelined requests
        // prematurely, see #2592
        L_ERROR(("HTTP parse, %lu bytes", c->recv.len));
        c->is_draining = 1;
        // s_hexdump(buf, c->recv.len - ofs > 16 ? 16 : c->recv.len - ofs); //
        // LOG???
        c->recv.len = 0;
        return;
      }
      if (n == 0) break;                        // Request is not buffered yet
      s_event_call(c, S_EVENT_HTTP_HDRS, &hm);  // Got all HTTP headers
      if (c->recv.len != old_len) {
        // User manipulated received data. Wash our hands
        L_DEBUG(("%lu detaching HTTP handler", c->id));
        c->pfn = NULL;
        return;
      }
      if (ev == S_EVENT_CLOSE) {  // If client did not set Content-Length
        hm.message.len = c->recv.len - ofs;  // and closes now, deliver MSG
        hm.body.len = hm.message.len - (size_t)(hm.body.buf - hm.message.buf);
      }
      if ((te = api_http_get_header(&hm, "Transfer-Encoding")) != NULL) {
        if (str_casecmp(*te, str("chunked")) == 0) {
          is_chunked = true;
        } else {
          s_event_error(c, "Invalid Transfer-Encoding");  // See #2460
          return;
        }
      } else if (api_http_get_header(&hm, "Content-length") == NULL) {
        // #2593: HTTP packets must contain either Transfer-Encoding or
        // Content-length
        bool is_response = ncasecmp(hm.method.buf, "HTTP/", 5) == 0;
        bool require_content_len = false;
        if (!is_response && (str_casecmp(hm.method, str("POST")) == 0 ||
                             str_casecmp(hm.method, str("PUT")) == 0)) {
          // POST and PUT should include an entity body. Therefore, they should
          // contain a Content-length header. Other requests can also contain a
          // body, but their content has no defined semantics (RFC 7231)
          require_content_len = true;
          ofs += (size_t)n;  // this request has been processed
        } else if (is_response) {
          // HTTP spec 7.2 Entity body: All other responses must include a body
          // or Content-Length header field defined with a value of 0.
          int status = api_http_status(&hm);
          require_content_len = status >= 200 && status != 204 && status != 304;
        }
        if (require_content_len) {
          if (!c->is_client) api_http_reply(c, 411, "", "");
          L_ERROR(("Content length missing from %s",
                   is_response ? "response" : "request"));
        }
      }

      if (is_chunked) {
        // For chunked data, strip off prefixes and suffixes from chunks
        // and relocate them right after the headers, then report a message
        char* s = (char*)c->recv.buf + ofs + n;
        int o = 0, pl, dl, cl, len = (int)(c->recv.len - ofs - (size_t)n);

        // Find zero-length chunk (the end of the body)
        while ((cl = skip_chunk(s + o, len - o, &pl, &dl)) > 0 && dl) o += cl;
        if (cl == 0) break;  // No zero-len chunk, buffer more data
        if (cl < 0) {
          s_event_error(c, "Invalid chunk");
          break;
        }

        // Zero chunk found. Second pass: strip + relocate
        o = 0, hm.body.len = 0, hm.message.len = (size_t)n;
        while ((cl = skip_chunk(s + o, len - o, &pl, &dl)) > 0) {
          memmove(s + hm.body.len, s + o + pl, (size_t)dl);
          o += cl, hm.body.len += (size_t)dl, hm.message.len += (size_t)dl;
          if (dl == 0) break;
        }
        ofs += (size_t)(n + o);
      } else {  // Normal, non-chunked data
        size_t len = c->recv.len - ofs - (size_t)n;
        if (hm.body.len > len) break;  // Buffer more data
        ofs += (size_t)n + hm.body.len;
      }

      if (c->is_accepted) c->is_resp = 1;      // Start generating response
      s_event_call(c, S_EVENT_HTTP_MSG, &hm);  // User handler can clear is_resp
      if (c->is_accepted && !c->is_resp) {
        struct str_t* cc = api_http_get_header(&hm, "Connection");
        if (cc != NULL && str_casecmp(*cc, str("close")) == 0) {
          c->is_draining = 1;  // honor "Connection: close"
          break;
        }
      }
    }
    if (ofs > 0) s_iobuf_del(&c->recv, 0, ofs);  // Delete processed data
  }
  (void)ev_data;
}

struct s_conn* api_http_connect(struct s_mgr* mgr, const char* url,
                                s_event_handler_t fn, void* fn_data) {
  return s_net_connect_svc(mgr, url, fn, fn_data, http_cb, NULL);
}

struct s_conn* api_http_listen(struct s_mgr* mgr, const char* url,
                               s_event_handler_t fn, void* fn_data) {
  struct s_conn* c = s_net_listen(mgr, url, fn, fn_data);
  if (c != NULL) c->pfn = http_cb;
  return c;
}