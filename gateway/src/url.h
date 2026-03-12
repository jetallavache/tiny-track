#ifndef TTG_URL_H
#define TTG_URL_H

#include <stddef.h>

#include "common/utils/str.h"

struct url {
  size_t key, user, pass, host, port, uri, end;
};

unsigned short ttg_url_port(const char* url);
int ttg_url_is_ssl(const char* url);
struct tt_util_string ttg_url_host(const char* url);
struct tt_util_string ttg_url_user(const char* url);
struct tt_util_string ttg_url_pass(const char* url);
const char* ttg_url_uri(const char* url);

#endif  // SRC_S_URL_H