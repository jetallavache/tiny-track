#ifndef SRC_B64_H
#define SRC_B64_H

#include <stddef.h>

size_t b64_update(unsigned char input_byte, char* buf, size_t len);
size_t b64_final(char* buf, size_t len);
size_t b64_encode(const unsigned char* p, size_t n, char* buf, size_t);
size_t b64_decode(const char* src, size_t n, char* dst, size_t);

#endif  // SRC_B64_H