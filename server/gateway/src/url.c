#include "url.h"

#include <stdlib.h>
#include <string.h>

int ttg_url_is_ssl(const char* url) {
  return strncmp(url, "wss:", 4) == 0 || strncmp(url, "https:", 6) == 0 ||
         strncmp(url, "ssl:", 4) == 0 || strncmp(url, "tls:", 4) == 0;
}

static struct ttg_url urlparse(const char* url) {
  size_t i;
  struct ttg_url u;
  memset(&u, 0, sizeof(u));
  for (i = 0; url[i] != '\0'; i++) {
    if (url[i] == '/' && i > 0 && u.host == 0 && url[i - 1] == '/') {
      u.host = i + 1;
      u.port = 0;
      /* } else if (url[i] == ']') { */
      /*   u.port = 0;  /* IPv6 URLs, like http:  /* [::1]/bar */
    } else if (url[i] == ':' && u.port == 0 && u.uri == 0) {
      u.port = i + 1;
    } else if (url[i] == '@' && u.user == 0 && u.pass == 0 && u.uri == 0) {
      u.user = u.host;
      u.pass = u.port;
      u.host = i + 1;
      u.port = 0;
    } else if (url[i] == '/' && u.host && u.uri == 0) {
      u.uri = i;
    }
  }
  u.end = i;
#if 0
  printf("[%s] %d %d %d %d %d\n", url, u.user, u.pass, u.host, u.port, u.uri);
#endif
  return u;
}

struct ttg_str ttg_url_host(const char* url) {
  struct ttg_url u = urlparse(url);
  size_t n = u.port  ? u.port - u.host - 1
             : u.uri ? u.uri - u.host
                     : u.end - u.host;
  struct ttg_str s = strl(url + u.host, n);
  return s;
}

const char* ttg_url_uri(const char* url) {
  struct ttg_url u = urlparse(url);
  return u.uri ? url + u.uri : "/";
}

unsigned short ttg_url_port(const char* url) {
  struct ttg_url u = urlparse(url);
  unsigned short port = 0;
  if (strncmp(url, "http:", 5) == 0 || strncmp(url, "ws:", 3) == 0)
    port = 80;
  if (strncmp(url, "wss:", 4) == 0 || strncmp(url, "https:", 6) == 0)
    port = 443;

  if (u.port)
    port = (unsigned short)atoi(url + u.port);
  return port;
}

struct ttg_str ttg_url_user(const char* url) {
  struct ttg_url u = urlparse(url);
  struct ttg_str s = str("");
  if (u.user && (u.pass || u.host)) {
    size_t n = u.pass ? u.pass - u.user - 1 : u.host - u.user - 1;
    s = strl(url + u.user, n);
  }
  return s;
}

struct ttg_str ttg_url_pass(const char* url) {
  struct ttg_url u = urlparse(url);
  struct ttg_str s = str("");
  if (u.pass && u.host) {
    size_t n = u.host - u.pass - 1;
    s = strl(url + u.pass, n);
  }
  return s;
}
