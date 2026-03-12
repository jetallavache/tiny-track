#ifndef TT_UTIL_H
#define TT_UTIL_H

#include <stdbool.h>
#include <stdint.h>
#include <unistd.h>

#define BYTE_TO_BIN_PATTERN "%c%c%c%c%c%c%c%c"
#define BYTE_TO_BIN(byte)                                       \
  ((byte) & 0x01 ? '1' : '0'), ((byte) & 0x02 ? '1' : '0'),     \
      ((byte) & 0x04 ? '1' : '0'), ((byte) & 0x08 ? '1' : '0'), \
      ((byte) & 0x10 ? '1' : '0'), ((byte) & 0x20 ? '1' : '0'), \
      ((byte) & 0x40 ? '1' : '0'), ((byte) & 0x80 ? '1' : '0')
#define NEXT_LINE(l)   \
  l = strchr(l, '\n'); \
  l++;
#define SHIFT_KB(x) (x) / 1024
#define SHIFT_MB(x) (x) / (1024 * 1024)
#define SHIFT_GB(x) (x) / (1024 * 1024 * 1024)

uint64_t util_millis(void);
bool util_random(void* buf, size_t len);
void util_bzero(volatile unsigned char* buf, size_t len);
uint8_t util_checksum(const void* data, size_t length);

#endif /* TT_UTIL_H */