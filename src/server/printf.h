#ifndef SRC_SERVER_PRINTF_H
#define SRC_SERVER_PRINTF_H

#include <stdarg.h>
#include <stdbool.h>

#include "iobuf.h"

typedef void (*s_pfn_t)(char, void*);               /* Выходная функция */
typedef size_t (*s_pm_t)(s_pfn_t, void*, va_list*); /* %M printer */

size_t s_vxprintf(void (*)(char, void*), void*, const char* fmt, va_list*);
size_t s_xprintf(void (*fn)(char, void*), void*, const char* fmt, ...);

// Convenience wrappers around s_xprintf
size_t s_vsnprintf(char* buf, size_t len, const char* fmt, va_list* ap);
size_t s_snprintf(char*, size_t, const char* fmt, ...);
char* s_vmprintf(const char* fmt, va_list* ap);
char* s_mprintf(const char* fmt, ...);
// size_t s_queue_vprintf(struct s_queue *, const char *fmt, va_list *);
// size_t s_queue_printf(struct s_queue *, const char *fmt, ...);

// %M print helper functions
size_t s_print_base64(void (*out)(char, void*), void* arg, va_list* ap);
size_t s_print_esc(void (*out)(char, void*), void* arg, va_list* ap);
size_t s_print_hex(void (*out)(char, void*), void* arg, va_list* ap);
size_t s_print_ip(void (*out)(char, void*), void* arg, va_list* ap);
size_t s_print_ip_port(void (*out)(char, void*), void* arg, va_list* ap);
size_t s_print_ip4(void (*out)(char, void*), void* arg, va_list* ap);
// size_t s_print_ip6(void (*out)(char, void *), void *arg, va_list *ap);
size_t s_print_mac(void (*out)(char, void*), void* arg, va_list* ap);

// Various output functions
void s_pfn_iobuf(char ch, void* param);  // param: struct s_iobuf *
void s_pfn_stdout(char c, void* param);  // param: ignored

// A helper macro for printing JSON: s_snprintf(buf, len, "%m", S_ESC("hi"))
#define S_ESC(str) s_print_esc, 0, (str)

#endif  // SRC_SERVER_PRINTF_H
