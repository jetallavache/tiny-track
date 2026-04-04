#include "util.h"

#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#include "common/log/log.h"

uint64_t ttg_util_millis(void) {
  struct timespec ts = {0, 0};
  clock_gettime(CLOCK_REALTIME, &ts);
  return ((uint64_t)ts.tv_sec * 1000 + (uint64_t)ts.tv_nsec / 1000000);
}

bool ttg_util_random(void* buf, size_t len) {
  bool success = false;
  unsigned char* p = (unsigned char*)buf;
  FILE* fp = fopen("/dev/urandom", "rb");
  if (fp != NULL) {
    if (fread(buf, 1, len, fp) == len) success = true;
    fclose(fp);
  }

  if (success == false) {
    tt_log_err("Weak RNG: using rand()");
    while (len--) *p++ = (unsigned char)(rand() & 255);
  }
  return success;
}

void ttg_util_bzero(volatile unsigned char* buf, size_t len) {
  if (buf != NULL) {
    while (len--) *buf++ = 0;
  }
}