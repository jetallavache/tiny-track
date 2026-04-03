#ifndef TTG_PRINTF_H
#define TTG_PRINTF_H

#include <stdarg.h>
#include <stdbool.h>
#include <stddef.h>

#include "iobuf.h"

struct ttg_addr; /* forward declaration */

typedef void (*ttg_pfn_t)(char, void*);                 /* Output function */
typedef size_t (*ttg_pm_t)(ttg_pfn_t, void*, va_list*); /* %M printer */

size_t ttg_vxprintf(void (*)(char, void*), void*, const char* fmt, va_list*);
size_t ttg_xprintf(void (*fn)(char, void*), void*, const char* fmt, ...);
size_t ttg_vsnprintf(char* buf, size_t len, const char* fmt, va_list* ap);

/* %M print helper functions */
size_t ttg_print_ip_port(void (*out)(char, void*), void* arg, va_list* ap);

/* Format struct ttg_addr* into buf as "ip:port". Returns buf. */
char* ttg_addr_str(const struct ttg_addr* a, char* buf, size_t len);

/* Various output functions */
void ttg_pfn_iobuf(char ch, void* param); /* param: struct ttg_iobuf * */

/* Unused public functions - kept for reference
void ttg_pfn_stdout(char c, void* param);
size_t print_base64(void (*out)(char, void*), void* arg, va_list* ap);
size_t print_esc(void (*out)(char, void*), void* arg, va_list* ap);
size_t print_hex(void (*out)(char, void*), void* arg, va_list* ap);
size_t print_ip(void (*out)(char, void*), void* arg, va_list* ap);
size_t print_ip4(void (*out)(char, void*), void* arg, va_list* ap);
size_t print_mac(void (*out)(char, void*), void* arg, va_list* ap);
#define ESC(str) print_esc, 0, (str)
*/

#endif /* TTG_PRINTF_H */
