#ifndef TTG_UTIL_H
#define TTG_UTIL_H

#include <stdbool.h>
#include <stdint.h>
#include <unistd.h>

#define BYTE_TO_BIN_PATTERN "%c%c%c%c%c%c%c%c"
#define BYTE_TO_BIN(byte)                                       \
  ((byte) & 0x01 ? '1' : '0'), ((byte) & 0x02 ? '1' : '0'),     \
      ((byte) & 0x04 ? '1' : '0'), ((byte) & 0x08 ? '1' : '0'), \
      ((byte) & 0x10 ? '1' : '0'), ((byte) & 0x20 ? '1' : '0'), \
      ((byte) & 0x40 ? '1' : '0'), ((byte) & 0x80 ? '1' : '0')

uint64_t ttg_util_millis(void);
bool ttg_util_random(void* buf, size_t len);
void ttg_util_bzero(volatile unsigned char* buf, size_t len);

#endif /* TTG_UTIL_H */