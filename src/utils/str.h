#ifndef SRC_STR_H
#define SRC_STR_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Описывает произвольную часть памяти */
struct str_t {
  char* buf;   // String data
  size_t len;  // String length
};

#define str(s) str_s(s)

struct str_t str_s(const char* s);
struct str_t str_n(const char* s, size_t n);
// int casecmp(const char *s1, const char *s2);
// int strcmp(const struct str_t str1, const struct str_t str2);
int str_casecmp(const struct str_t str1, const struct str_t str2);
// struct str_t strdup(const struct str_t s);
bool str_match(struct str_t str, struct str_t pattern, struct str_t* caps);
// bool span(struct str_t s, struct str_t *a, struct str_t *b, char delim);
bool str_to_num(struct str_t, int base, void* val, size_t val_len);

#endif  // SRC_STR_H