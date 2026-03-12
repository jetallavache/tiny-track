#ifndef TT_UTIL_STR_H
#define TT_UTIL_STR_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Описывает произвольную часть памяти */
struct tt_util_string {
  char* buf;  /* String data */
  size_t len; /* String length */
};

#define str(s) str_s(s)

struct tt_util_string str_s(const char* s);
struct tt_util_string str_n(const char* s, size_t n);

int str_casecmp(const struct tt_util_string str1,
                const struct tt_util_string str2);
bool str_match(struct tt_util_string str, struct tt_util_string pattern,
               struct tt_util_string* caps);
bool str_to_num(struct tt_util_string, int base, void* val, size_t val_len);

#endif /* TT_UTIL_STR_H */