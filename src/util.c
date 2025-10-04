#include "util.h"

#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#include "log.h"

uint64_t util_millis(void) {
  struct timespec ts = {0, 0};
  clock_gettime(CLOCK_REALTIME, &ts);
  return ((uint64_t)ts.tv_sec * 1000 + (uint64_t)ts.tv_nsec / 1000000);
}

bool util_random(void *buf, size_t len) {
  bool success = false;
  unsigned char *p = (unsigned char *)buf;
  FILE *fp = fopen("/dev/urandom", "rb");
  if (fp != NULL) {
    if (fread(buf, 1, len, fp) == len) success = true;
    fclose(fp);
  }

  if (success == false) {
    L_ERROR(("Weak RNG: using rand()"));
    while (len--) *p++ = (unsigned char)(rand() & 255);
  }
  return success;
}

void util_bzero(volatile unsigned char *buf, size_t len) {
  if (buf != NULL) {
    while (len--) *buf++ = 0;
  }
}

uint8_t util_checksum(const void *data, size_t length) {
  const uint8_t *bytes = (const uint8_t *)data;
  uint8_t sum = 0;

  for (size_t i = 0; i < length; i++) {
    sum ^= bytes[i]; /* XOR checksum */
  }

  return sum;
}