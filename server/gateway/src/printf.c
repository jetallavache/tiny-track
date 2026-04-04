#include "printf.h"

#include <netinet/in.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "net.h"

/* Output function that writes into a ttg_iobuf, expanding it as needed */
static void pfn_iobuf_expand(char ch, void* param) {
  struct ttg_iobuf* io = (struct ttg_iobuf*)param;
  if (io->len + 2 > io->size)
    ttg_iobuf_resize(io, io->len + 2);
  if (io->len + 2 <= io->size) {
    io->buf[io->len++] = (uint8_t)ch;
    io->buf[io->len] = 0;
  }
}

/* Output function for fixed-size buffers (no expansion) */
static void pfn_iobuf_static(char ch, void* param) {
  struct ttg_iobuf* io = (struct ttg_iobuf*)param;
  if (io->len + 2 <= io->size) {
    io->buf[io->len++] = (uint8_t)ch;
    io->buf[io->len] = 0;
  }
}

void ttg_pfn_iobuf(char ch, void* param) {
  pfn_iobuf_expand(ch, param);
}

/* Core formatter. Supports: %d %u %x %X %p %s %c %% %M %m
 * and width/precision/padding. Delegates numeric/float to snprintf. */
size_t ttg_vxprintf(void (*out)(char, void*), void* param, const char* fmt,
                    va_list* ap) {
  size_t n = 0;
  size_t i = 0;

  while (fmt[i] != '\0') {
    if (fmt[i] != '%') {
      out(fmt[i++], param);
      n++;
      continue;
    }

    i++; /* skip '%' */
    char spec[32];
    size_t si = 0;
    spec[si++] = '%';

    /* Collect flags, width, precision, length modifiers */
    while (fmt[i] && strchr("-+ #0", fmt[i]))
      spec[si++] = fmt[i++];
    while (fmt[i] >= '0' && fmt[i] <= '9')
      spec[si++] = fmt[i++];
    if (fmt[i] == '.') {
      spec[si++] = fmt[i++];
      if (fmt[i] == '*') {
        int pw = va_arg(*ap, int);
        si += (size_t)snprintf(spec + si, sizeof(spec) - si, "%d", pw);
        i++;
      } else {
        while (fmt[i] >= '0' && fmt[i] <= '9')
          spec[si++] = fmt[i++];
      }
    }
    /* Length modifiers */
    int is_long = 0;
    while (fmt[i] == 'h')
      i++;
    while (fmt[i] == 'l')
      is_long++, i++;
    if (fmt[i] == 'z' || fmt[i] == 'j' || fmt[i] == 't')
      spec[si++] = fmt[i++];

    char c = fmt[i++];
    char tmp[64];
    size_t tlen = 0;

    if (c == 'd' || c == 'i' || c == 'u' || c == 'x' || c == 'X' || c == 'o' ||
        c == 'p') {
      spec[si++] = c;
      spec[si] = '\0';
      if (c == 'p' || is_long >= 2) {
        long long v = (c == 'p') ? (long long)(uintptr_t)va_arg(*ap, void*)
                                 : va_arg(*ap, long long);
        tlen = (size_t)snprintf(tmp, sizeof(tmp), spec, v);
      } else if (is_long == 1) {
        long v = va_arg(*ap, long);
        tlen = (size_t)snprintf(tmp, sizeof(tmp), spec, v);
      } else {
        int v = va_arg(*ap, int);
        tlen = (size_t)snprintf(tmp, sizeof(tmp), spec, v);
      }
      for (size_t j = 0; j < tlen; j++)
        out(tmp[j], param);
      n += tlen;
    } else if (c == 'f' || c == 'g' || c == 'e' || c == 'G' || c == 'E') {
      spec[si++] = c;
      spec[si] = '\0';
      double v = va_arg(*ap, double);
      tlen = (size_t)snprintf(tmp, sizeof(tmp), spec, v);
      for (size_t j = 0; j < tlen; j++)
        out(tmp[j], param);
      n += tlen;
    } else if (c == 's') {
      char* p = va_arg(*ap, char*);
      spec[si++] = 's';
      spec[si] = '\0';
      if (p == NULL)
        p = "(null)";
      tlen = (size_t)snprintf(tmp, sizeof(tmp), spec, p);
      /* For long strings snprintf may truncate — emit directly */
      if (tlen < sizeof(tmp)) {
        for (size_t j = 0; j < tlen; j++)
          out(tmp[j], param);
        n += tlen;
      } else {
        size_t slen = strlen(p);
        for (size_t j = 0; j < slen; j++)
          out(p[j], param);
        n += slen;
      }
    } else if (c == 'c') {
      char ch = (char)va_arg(*ap, int);
      out(ch, param);
      n++;
    } else if (c == 'm' || c == 'M') {
      ttg_pm_t f = va_arg(*ap, ttg_pm_t);
      if (c == 'm') {
        out('"', param);
        n++;
      }
      n += f(out, param, ap);
      if (c == 'm') {
        out('"', param);
        n++;
      }
    } else if (c == '%') {
      out('%', param);
      n++;
    } else {
      out('%', param);
      out(c, param);
      n += 2;
    }
  }
  return n;
}

size_t ttg_xprintf(void (*out)(char, void*), void* ptr, const char* fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  size_t n = ttg_vxprintf(out, ptr, fmt, &ap);
  va_end(ap);
  return n;
}

size_t ttg_vsnprintf(char* buf, size_t len, const char* fmt, va_list* ap) {
  struct ttg_iobuf io = {(uint8_t*)buf, len, 0, 0};
  size_t n = ttg_vxprintf(pfn_iobuf_static, &io, fmt, ap);
  if (n < len)
    buf[n] = '\0';
  return n;
}

/* %M helper: print IP:port from struct ttg_addr* */
static size_t print_ip4(void (*out)(char, void*), void* arg, uint8_t* p) {
  return ttg_xprintf(out, arg, "%d.%d.%d.%d", p[0], p[1], p[2], p[3]);
}

static size_t print_ip_(void (*out)(char, void*), void* arg, va_list* ap) {
  struct ttg_addr* addr = va_arg(*ap, struct ttg_addr*);
  return print_ip4(out, arg, (uint8_t*)&addr->ip);
}

size_t ttg_print_ip_port(void (*out)(char, void*), void* arg, va_list* ap) {
  struct ttg_addr* a = va_arg(*ap, struct ttg_addr*);
  return ttg_xprintf(out, arg, "%M:%hu", print_ip_, a, ntohs(a->port));
}

char* ttg_addr_str(const struct ttg_addr* a, char* buf, size_t len) {
  uint8_t* ip = (uint8_t*)a->ip;
  snprintf(buf, len, "%d.%d.%d.%d:%hu", ip[0], ip[1], ip[2], ip[3],
           ntohs(a->port));
  return buf;
}
