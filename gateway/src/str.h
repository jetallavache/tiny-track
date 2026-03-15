#ifndef TT_UTIL_STR_H
#define TT_UTIL_STR_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

struct ttg_str {
  char* buf;  /* String data */
  size_t len; /* String length */
};

struct ttg_str ttg_str_create(const char*);
struct ttg_str ttg_str_create_with_size(const char*, size_t len);

int ttg_str_casecmp(const struct ttg_str, const struct ttg_str);
bool ttg_str_match(struct ttg_str, struct ttg_str, struct ttg_str*);
bool ttg_str_to_num(struct ttg_str, int base, void* val, size_t val_len);

#define str(s) ttg_str_create(s)
#define strl(s, len) ttg_str_create_with_size(s, len)

#endif /* TT_UTIL_STR_H */