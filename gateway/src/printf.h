#ifndef TTG_PRINTF_H
#define TTG_PRINTF_H

#include <stdarg.h>
#include <stdbool.h>

#include "iobuf.h"

typedef void (*ttg_pfn_t)(char, void*);                 /* Output function */
typedef size_t (*ttg_pm_t)(ttg_pfn_t, void*, va_list*); /* %M printer */

size_t ttg_vxprintf(void (*)(char, void*), void*, const char* fmt, va_list*);
size_t ttg_xprintf(void (*fn)(char, void*), void*, const char* fmt, ...);

/* Convenience wrappers around ttg_xprintf */
size_t s_vsnprintf(char* buf, size_t len, const char* fmt, va_list* ap);
size_t s_snprintf(char*, size_t, const char* fmt, ...);
char* s_vmprintf(const char* fmt, va_list* ap);
char* s_mprintf(const char* fmt, ...);

/* %M print helper functions */
size_t s_print_base64(void (*out)(char, void*), void* arg, va_list* ap);
size_t s_print_esc(void (*out)(char, void*), void* arg, va_list* ap);
size_t s_print_hex(void (*out)(char, void*), void* arg, va_list* ap);
size_t s_print_ip(void (*out)(char, void*), void* arg, va_list* ap);
size_t s_print_ip_port(void (*out)(char, void*), void* arg, va_list* ap);
size_t s_print_ip4(void (*out)(char, void*), void* arg, va_list* ap);
size_t s_print_mac(void (*out)(char, void*), void* arg, va_list* ap);

/* Various output functions */
void ttg_pfn_iobuf(char ch, void* param);  /* param: struct ttg_iobuf * */
void ttg_pfn_stdout(char c, void* param);  /* param: ignored */

/* A helper macro for printing JSON: s_snprintf(buf, len, "%m", S_ESC("hi")) */
#define S_ESC(str) s_print_esc, 0, (str)

#endif  /* TTG_PRINTF_H */
