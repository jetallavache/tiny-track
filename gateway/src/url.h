#ifndef TTG_URL_H
#define TTG_URL_H

#include <stddef.h>

#include "str.h"
struct ttg_url {
  size_t key, user, pass, host, port, uri, end;
};

unsigned short ttg_url_port(const char*);
int ttg_url_is_ssl(const char*);
struct ttg_str ttg_url_host(const char*);
struct ttg_str ttg_url_user(const char*);
struct ttg_str ttg_url_pass(const char*);
const char* ttg_url_uri(const char*);

#endif /* TTG_URL_H */