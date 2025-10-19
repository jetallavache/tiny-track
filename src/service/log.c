#include "log.h"

#include <stdio.h>
#include <string.h>

#include "../server/printf.h"
#include "../utils/util.h"

int log_level = LL_DEBUG;
static s_pfn_t log_func = s_pfn_stdout;
static void* log_func_param = NULL;

// void log_set_fn(s_pfn_t fn, void *param) {
//   log_func = fn;
//   log_func_param = param;
// }

static void logc(unsigned char c) { log_func((char)c, log_func_param); }

static void logs(const char* buf, size_t len) {
  size_t i;
  for (i = 0; i < len; i++) logc(((unsigned char*)buf)[i]);
}

void out_prefix(int level, const char* file, int line, const char* fname) {
  const char* p = strrchr(file, '/');
  char buf[41];
  size_t n;
  if (p == NULL) p = strrchr(file, '\\');
  n = snprintf(buf, sizeof(buf), "%-6llx %d %s:%d:%s",
               (long long unsigned int)util_millis(), level,
               p == NULL ? file : p + 1, line, fname);
  if (n > sizeof(buf) - 2) n = sizeof(buf) - 2;
  while (n < sizeof(buf)) buf[n++] = ' ';
  logs(buf, n - 1);
}

void out(const char* fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  s_vxprintf(log_func, log_func_param, fmt, &ap);
  va_end(ap);
  logs("\r\n", 2);
}

static unsigned char nibble(unsigned c) {
  return (unsigned char)(c < 10 ? c + '0' : c + 'W');
}

#define ISPRINT(x) ((x) >= ' ' && (x) <= '~')
void out_hexdump(const void* buf, size_t len) {
  const unsigned char* p = (const unsigned char*)buf;
  unsigned char ascii[16], alen = 0;
  size_t i;
  for (i = 0; i < len; i++) {
    if ((i % 16) == 0) {
      // Print buffered ascii chars
      if (i > 0)
        logs("  ", 2), logs((char*)ascii, 16), logs("\r\n", 2), alen = 0;
      // Print hex address, then \t
      logc(nibble((i >> 12) & 15)), logc(nibble((i >> 8) & 15)),
          logc(nibble((i >> 4) & 15)), logc('0'), logs("   ", 3);
    }
    logc(nibble(p[i] >> 4)), logc(nibble(p[i] & 15));  // Two nibbles, e.g. c5
    logc(' ');                                         // Space after hex number
    ascii[alen++] = ISPRINT(p[i]) ? p[i] : '.';        // Add to the ascii buf
  }
  while (alen < 16) logs("   ", 3), ascii[alen++] = ' ';
  logs("  ", 2), logs((char*)ascii, 16), logs("\r\n", 2);
}
