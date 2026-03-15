#include "printf.h"

#include <netinet/in.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "net.h"

static bool is_digit(int c) {
  return c >= '0' && c <= '9';
}

static int addexp(char* buf, int e, int sign) {
  int n = 0;
  buf[n++] = 'e';
  buf[n++] = (char)sign;
  if (e > 400)
    return 0;
  if (e < 10)
    buf[n++] = '0';
  if (e >= 100)
    buf[n++] = (char)(e / 100 + '0'), e -= 100 * (e / 100);
  if (e >= 10)
    buf[n++] = (char)(e / 10 + '0'), e -= 10 * (e / 10);
  buf[n++] = (char)(e + '0');
  return n;
}

static int xisinf(double x) {
  union {
    double f;
    uint64_t u;
  } ieee754 = {x};
  return ((unsigned)(ieee754.u >> 32) & 0x7fffffff) == 0x7ff00000 &&
         ((unsigned)ieee754.u == 0);
}

static int xisnan(double x) {
  union {
    double f;
    uint64_t u;
  } ieee754 = {x};
  return ((unsigned)(ieee754.u >> 32) & 0x7fffffff) +
             ((unsigned)ieee754.u != 0) >
         0x7ff00000;
}

static size_t dtoa(char* dst, size_t dstlen, double d, int width, bool tz) {
  char buf[40];
  int i, s = 0, n = 0, e = 0;
  double t, mul, saved;
  if (d == 0.0)
    return snprintf(dst, dstlen, "%s", "0");
  if (xisinf(d))
    return snprintf(dst, dstlen, "%s", d > 0 ? "inf" : "-inf");
  if (xisnan(d))
    return snprintf(dst, dstlen, "%s", "nan");
  if (d < 0.0)
    d = -d, buf[s++] = '-';

  /* Round */
  saved = d;
  if (tz) {
    mul = 1.0;
    while (d >= 10.0 && d / mul >= 10.0)
      mul *= 10.0;
  } else {
    mul = 0.1;
  }

  while (d <= 1.0 && d / mul <= 1.0)
    mul /= 10.0;
  for (i = 0, t = mul * 5; i < width; i++)
    t /= 10.0;

  d += t;

  /* Calculate exponent, and 'mul' for scientific representation */
  mul = 1.0;
  while (d >= 10.0 && d / mul >= 10.0)
    mul *= 10.0, e++;
  while (d < 1.0 && d / mul < 1.0)
    mul /= 10.0, e--;
  /* printf(" --> %g %d %g %g\n", saved, e, t, mul); */

  if (tz && e >= width && width > 1) {
    n = (int)dtoa(buf, sizeof(buf), saved / mul, width, tz);
    /* printf(" --> %.*g %d [%.*s]\n", 10, d / t, e, n, buf); */
    n += addexp(buf + s + n, e, '+');
    return snprintf(dst, dstlen, "%.*s", n, buf);
  } else if (tz && e <= -width && width > 1) {
    n = (int)dtoa(buf, sizeof(buf), saved / mul, width, tz);
    /* printf(" --> %.*g %d [%.*s]\n", 10, d / mul, e, n, buf); */
    n += addexp(buf + s + n, -e, '-');
    return snprintf(dst, dstlen, "%.*s", n, buf);
  } else {
    int targ_width = width;
    for (i = 0, t = mul; t >= 1.0 && s + n < (int)sizeof(buf); i++) {
      int ch = (int)(d / t);
      if (n > 0 || ch > 0)
        buf[s + n++] = (char)(ch + '0');
      d -= ch * t;
      t /= 10.0;
    }
    /* printf(" --> [%g] -> %g %g (%d) [%.*s]\n", saved, d, t, n, s + n, buf); */
    if (n == 0)
      buf[s++] = '0';
    while (t >= 1.0 && n + s < (int)sizeof(buf))
      buf[n++] = '0', t /= 10.0;
    if (s + n < (int)sizeof(buf))
      buf[n + s++] = '.';
    /* printf(" 1--> [%g] -> [%.*s]\n", saved, s + n, buf); */
    if (!tz && n > 0)
      targ_width = width + n;
    for (i = 0, t = 0.1; s + n < (int)sizeof(buf) && n < targ_width; i++) {
      int ch = (int)(d / t);
      buf[s + n++] = (char)(ch + '0');
      d -= ch * t;
      t /= 10.0;
    }
  }

  while (tz && n > 0 && buf[s + n - 1] == '0')
    n--;  /* Trim trailing zeroes */
  if (tz && n > 0 && buf[s + n - 1] == '.')
    n--;  /* Trim trailing dot */
  n += s;
  if (n >= (int)sizeof(buf))
    n = (int)sizeof(buf) - 1;
  buf[n] = '\0';
  return snprintf(dst, dstlen, "%s", buf);
}

static size_t lld(char* buf, int64_t val, bool is_signed, bool is_hex) {
  const char* letters = "0123456789abcdef";
  uint64_t v = (uint64_t)val;
  size_t s = 0, n, i;
  if (is_signed && val < 0)
    buf[s++] = '-', v = (uint64_t)(-val);
  /* This loop prints a number in reverse order. I guess this is because we */
  /* write numbers from right to left: least significant digit comes last. */
  /* Maybe because we use Arabic numbers, and Arabs write RTL? */
  if (is_hex) {
    for (n = 0; v; v >>= 4)
      buf[s + n++] = letters[v & 15];
  } else {
    for (n = 0; v; v /= 10)
      buf[s + n++] = letters[v % 10];
  }
  /* Reverse a string */
  for (i = 0; i < n / 2; i++) {
    char t = buf[s + i];
    buf[s + i] = buf[s + n - i - 1], buf[s + n - i - 1] = t;
  }
  if (val == 0)
    buf[n++] = '0';  /* Handle special case */
  return n + s;
}

static size_t scpy(void (*out)(char, void*), void* ptr, char* buf, size_t len) {
  size_t i = 0;
  while (i < len && buf[i] != '\0')
    out(buf[i++], ptr);
  return i;
}

size_t ttg_vxprintf(void (*out)(char, void*), void* param, const char* fmt,
                    va_list* ap) {
  size_t i = 0, n = 0;
  while (fmt[i] != '\0') {
    if (fmt[i] == '%') {
      size_t j, k, x = 0, is_long = 0, w = 0 /* width */, pr = ~0U /* prec */;
      char pad = ' ', minus = 0, c = fmt[++i];
      if (c == '#')
        x++, c = fmt[++i];
      if (c == '-')
        minus++, c = fmt[++i];
      if (c == '0')
        pad = '0', c = fmt[++i];
      while (is_digit(c))
        w *= 10, w += (size_t)(c - '0'), c = fmt[++i];
      if (c == '.') {
        c = fmt[++i];
        if (c == '*') {
          pr = (size_t)va_arg(*ap, int);
          c = fmt[++i];
        } else {
          pr = 0;
          while (is_digit(c))
            pr *= 10, pr += (size_t)(c - '0'), c = fmt[++i];
        }
      }
      while (c == 'h')
        c = fmt[++i];  /* Treat h and hh as int */
      if (c == 'l') {
        is_long++, c = fmt[++i];
        if (c == 'l')
          is_long++, c = fmt[++i];
      }
      if (c == 'p')
        x = 1, is_long = 1;
      if (c == 'd' || c == 'u' || c == 'x' || c == 'X' || c == 'p' ||
          c == 'g' || c == 'f') {
        bool s = (c == 'd'), h = (c == 'x' || c == 'X' || c == 'p');
        char tmp[40];
        size_t xl = x ? 2 : 0;
        if (c == 'g' || c == 'f') {
          double v = va_arg(*ap, double);
          if (pr == ~0U)
            pr = 6;
          k = dtoa(tmp, sizeof(tmp), v, (int)pr, c == 'g');
        } else if (is_long == 2) {
          int64_t v = va_arg(*ap, int64_t);
          k = lld(tmp, v, s, h);
        } else if (is_long == 1) {
          long v = va_arg(*ap, long);
          k = lld(tmp, s ? (int64_t)v : (int64_t)(unsigned long)v, s, h);
        } else {
          int v = va_arg(*ap, int);
          k = lld(tmp, s ? (int64_t)v : (int64_t)(unsigned)v, s, h);
        }
        for (j = 0; j < xl && w > 0; j++)
          w--;
        for (j = 0; pad == ' ' && !minus && k < w && j + k < w; j++)
          n += scpy(out, param, &pad, 1);
        n += scpy(out, param, (char*)"0x", xl);
        for (j = 0; pad == '0' && k < w && j + k < w; j++)
          n += scpy(out, param, &pad, 1);
        n += scpy(out, param, tmp, k);
        for (j = 0; pad == ' ' && minus && k < w && j + k < w; j++)
          n += scpy(out, param, &pad, 1);
      } else if (c == 'm' || c == 'M') {
        ttg_pm_t f = va_arg(*ap, ttg_pm_t);
        if (c == 'm')
          out('"', param);
        n += f(out, param, ap);
        if (c == 'm')
          n += 2, out('"', param);
      } else if (c == 'c') {
        int ch = va_arg(*ap, int);
        out((char)ch, param);
        n++;
      } else if (c == 's') {
        char* p = va_arg(*ap, char*);
        if (pr == ~0U)
          pr = p == NULL ? 0 : strlen(p);
        for (j = 0; !minus && pr < w && j + pr < w; j++)
          n += scpy(out, param, &pad, 1);
        n += scpy(out, param, p, pr);
        for (j = 0; minus && pr < w && j + pr < w; j++)
          n += scpy(out, param, &pad, 1);
      } else if (c == '%') {
        out('%', param);
        n++;
      } else {
        out('%', param);
        out(c, param);
        n += 2;
      }
      i++;
    } else {
      out(fmt[i], param), n++, i++;
    }
  }
  return n;
}

/* Does xprintf implementation exist in standard libraries? */

size_t ttg_xprintf(void (*out)(char, void*), void* ptr, const char* fmt, ...) {
  size_t len = 0;
  va_list ap;
  va_start(ap, fmt);
  len = ttg_vxprintf(out, ptr, fmt, &ap);
  va_end(ap);
  return len;
}

static void pfn_iobuf_private(char ch, void* param, bool expand) {
  struct ttg_iobuf* io = (struct ttg_iobuf*)param;
  if (expand && io->len + 2 > io->size)
    ttg_iobuf_resize(io, io->len + 2);
  if (io->len + 2 <= io->size) {
    io->buf[io->len++] = (uint8_t)ch;
    io->buf[io->len] = 0;
  } else if (io->len < io->size) {
    io->buf[io->len++] = 0; /* Guarantee to 0-terminate */
  }
}

static void putchar_iobuf_static(char ch, void* param) {
  pfn_iobuf_private(ch, param, false);
}

void ttg_pfn_iobuf(char ch, void* param) {
  pfn_iobuf_private(ch, param, true);
}

size_t ttg_vsnprintf(char* buf, size_t len, const char* fmt, va_list* ap) {
  struct ttg_iobuf io = {(uint8_t*)buf, len, 0, 0};
  size_t n = ttg_vxprintf(putchar_iobuf_static, &io, fmt, ap);
  if (n < len)
    buf[n] = '\0';
  return n;
}

static size_t snprintf_(char* buf, size_t len, const char* fmt, ...) {
  va_list ap;
  size_t n;
  va_start(ap, fmt);
  n = ttg_vsnprintf(buf, len, fmt, &ap);
  va_end(ap);
  return n;
}

static char* vmprintf_(const char* fmt, va_list* ap) {
  struct ttg_iobuf io = {0, 0, 0, 256};
  ttg_vxprintf(ttg_pfn_iobuf, &io, fmt, ap);
  return (char*)io.buf;
}

static char* mprintf_(const char* fmt, ...) {
  char* s;
  va_list ap;
  va_start(ap, fmt);
  s = vmprintf_(fmt, &ap);
  va_end(ap);
  return s;
}

/* Unused - kept for reference
static void pfn_stdout_(char c, void* param) {
  putchar(c);
  (void)param;
}
*/

static size_t print_ip4(void (*out)(char, void*), void* arg, uint8_t* p) {
  return ttg_xprintf(out, arg, "%d.%d.%d.%d", p[0], p[1], p[2], p[3]);
}

static size_t print_ip4_(void (*out)(char, void*), void* arg, va_list* ap) {
  uint8_t* p = va_arg(*ap, uint8_t*);
  return print_ip4(out, arg, p);
}

static size_t print_ip_(void (*out)(char, void*), void* arg, va_list* ap) {
  struct ttg_addr* addr = va_arg(*ap, struct ttg_addr*);
  /*   if (addr->is_ip6) return print_ip6(out, arg, (uint16_t *) addr->ip); */
  return print_ip4(out, arg, (uint8_t*)&addr->ip);
}

size_t ttg_print_ip_port(void (*out)(char, void*), void* arg, va_list* ap) {
  struct ttg_addr* a = va_arg(*ap, struct ttg_addr*);
  return ttg_xprintf(out, arg, "%M:%hu", print_ip_, a, ntohs(a->port));
}

/* Unused - kept for reference
static size_t print_mac_(void (*out)(char, void*), void* arg, va_list* ap) {
  uint8_t* p = va_arg(*ap, uint8_t*);
  return ttg_xprintf(out, arg, "%02x:%02x:%02x:%02x:%02x:%02x", p[0], p[1],
                     p[2], p[3], p[4], p[5]);
}

static char esc(int c, bool esc) {
  const char *p, *esc1 = "\b\f\n\r\t\\\"", *esc2 = "bfnrt\\\"";
  for (p = esc ? esc1 : esc2; *p != '\0'; p++) {
    if (*p == c)
      return esc ? esc2[p - esc1] : esc1[p - esc2];
  }
  return 0;
}

static char escape(int c) {
  return esc(c, true);
}

static size_t qcpy(void (*out)(char, void*), void* ptr, char* buf, size_t len) {
  size_t i = 0, extra = 0;
  for (i = 0; i < len && buf[i] != '\0'; i++) {
    char c = escape(buf[i]);
    if (c) {
      out('\\', ptr), out(c, ptr), extra++;
    } else {
      out(buf[i], ptr);
    }
  }
  return i + extra;
}

static size_t bcpy(void (*out)(char, void*), void* arg, uint8_t* buf,
                   size_t len) {
  size_t i, j, n = 0;
  const char* t =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (i = 0; i < len; i += 3) {
    uint8_t c1 = buf[i], c2 = i + 1 < len ? buf[i + 1] : 0,
            c3 = i + 2 < len ? buf[i + 2] : 0;
    char tmp[4] = {t[c1 >> 2], t[(c1 & 3) << 4 | (c2 >> 4)], '=', '='};
    if (i + 1 < len)
      tmp[2] = t[(c2 & 15) << 2 | (c3 >> 6)];
    if (i + 2 < len)
      tmp[3] = t[c3 & 63];
    for (j = 0; j < sizeof(tmp) && tmp[j] != '\0'; j++)
      out(tmp[j], arg);
    n += j;
  }
  return n;
}

static size_t print_hex_(void (*out)(char, void*), void* arg, va_list* ap) {
  size_t bl = (size_t)va_arg(*ap, int);
  uint8_t* p = va_arg(*ap, uint8_t*);
  const char* hex = "0123456789abcdef";
  size_t j;
  for (j = 0; j < bl; j++) {
    out(hex[(p[j] >> 4) & 0x0F], arg);
    out(hex[p[j] & 0x0F], arg);
  }
  return 2 * bl;
}
static size_t print_base64_(void (*out)(char, void*), void* arg, va_list* ap) {
  size_t len = (size_t)va_arg(*ap, int);
  uint8_t* buf = va_arg(*ap, uint8_t*);
  return bcpy(out, arg, buf, len);
}

static size_t print_esc_(void (*out)(char, void*), void* arg, va_list* ap) {
  size_t len = (size_t)va_arg(*ap, int);
  char* p = va_arg(*ap, char*);
  if (len == 0)
    len = p == NULL ? 0 : strlen(p);
  return qcpy(out, arg, p, len);
}
*/
