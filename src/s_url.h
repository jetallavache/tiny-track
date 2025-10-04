#ifndef SRC_S_URL_H
#define SRC_S_URL_H

#include <stddef.h>

#include "str.h"

struct url {
  size_t key, user, pass, host, port, uri, end;
};

unsigned short s_url_port(const char *url);
int s_url_is_ssl(const char *url);
struct str_t s_url_host(const char *url);
struct str_t s_url_user(const char *url);
struct str_t s_url_pass(const char *url);
const char *s_url_uri(const char *url);

#endif  // SRC_S_URL_H