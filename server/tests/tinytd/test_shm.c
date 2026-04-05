/*
 * test_shm.c - Unit tests for ttr_shm_create / ttr_shm_read / unlink.
 *
 * Note: ttr_shm_unlink() calls shm_unlink() (POSIX shm names only).
 * For /tmp/ paths we use unlink() directly.
 * ttr_shm_create/read return negative error codes (not NULL) on failure.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

#include "common/ringbuf/shm.h"

#define PATH "/tmp/tt-test-shm-unit.dat"
#define SZ 4096

#define PASS "\033[32mPASS\033[0m"
#define FAIL "\033[31mFAIL\033[0m"

static int g_run = 0, g_fail = 0;

#define CHECK(label, cond)                \
  do {                                    \
    g_run++;                              \
    if (cond) {                           \
      printf("  [" PASS "] %s\n", label); \
    } else {                              \
      printf("  [" FAIL "] %s\n", label); \
      g_fail++;                           \
    }                                     \
  } while (0)

static void test_create_read_unlink(void) {
  printf("\n[shm create/read/unlink]\n");
  unlink(PATH);

  void* addr = ttr_shm_create(PATH, SZ, 0600);
  int ok_create = (intptr_t)addr >= 0;
  CHECK("create returns valid addr", ok_create);
  if (!ok_create) return;

  memset(addr, 0xAB, SZ);
  ttr_shm_dealloc(addr, SZ);

  size_t sz = 0;
  void* raddr = ttr_shm_read(PATH, &sz);
  int ok_read = (intptr_t)raddr >= 0;
  CHECK("read returns valid addr", ok_read);
  CHECK("read size matches", sz == SZ);

  if (ok_read) {
    unsigned char* p = raddr;
    int data_ok = 1;
    for (size_t i = 0; i < SZ; i++) {
      if (p[i] != 0xAB) {
        data_ok = 0;
        break;
      }
    }
    CHECK("data integrity", data_ok);
    ttr_shm_dealloc(raddr, sz);
  }

  unlink(PATH);

  /* After unlink, read should fail */
  void* gone = ttr_shm_read(PATH, &sz);
  int gone_err = (intptr_t)gone < 0;
  CHECK("read after unlink returns error", gone_err);
  if (!gone_err) ttr_shm_dealloc(gone, sz);
}

static void test_create_zero_size(void) {
  printf("\n[shm zero size]\n");
  unlink(PATH);
  void* addr = ttr_shm_create(PATH, 0, 0600);
  /* ftruncate(0) + mmap(0) → error */
  int is_err = (intptr_t)addr < 0;
  CHECK("zero size → error", is_err);
  if (!is_err) ttr_shm_dealloc(addr, 0);
  unlink(PATH);
}

int main(void) {
  printf("=== test_shm ===\n");
  test_create_read_unlink();
  test_create_zero_size();

  printf("\n--- %d/%d passed ---\n", g_run - g_fail, g_run);
  return g_fail ? 1 : 0;
}
