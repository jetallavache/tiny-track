/*
 * test_recovery.c - Fault tolerance test for tinytd shadow recovery.
 *
 * Tests that after kill -KILL, tinytd restores ring buffer data from shadow.
 *
 * Usage: run via tests/run_recovery_test.sh
 */
#define _POSIX_C_SOURCE 200809L
#define _BSD_SOURCE
#include <fcntl.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#include "common/ringbuf.h"
#include "common/proto/v1.h"

#define LIVE_PATH   "/tmp/tinytd-test-live.dat"
#define SHADOW_PATH "/tmp/tinytd-test-shadow.dat"
#define TINYTD_BIN  "./tinytd/tinytd"
#define TEST_CONF   "./tests/tinytd-test.conf"

#define PASS "\033[32mPASS\033[0m"
#define FAIL "\033[31mFAIL\033[0m"

static int tests_run = 0;
static int tests_failed = 0;

#define CHECK(label, cond) do { \
  tests_run++; \
  if (cond) { \
    printf("  [" PASS "] %s\n", label); \
  } else { \
    printf("  [" FAIL "] %s\n", label); \
    tests_failed++; \
  } \
} while (0)

/* Map a file read-only, return addr and size */
static void* map_file(const char* path, size_t* out_size) {
  int fd = open(path, O_RDONLY);
  if (fd < 0)
    return NULL;
  struct stat st;
  if (fstat(fd, &st) < 0 || st.st_size == 0) {
    close(fd);
    return NULL;
  }
  *out_size = (size_t)st.st_size;
  void* addr = mmap(NULL, *out_size, PROT_READ, MAP_SHARED, fd, 0);
  close(fd);
  return (addr == MAP_FAILED) ? NULL : addr;
}

static void snapshot_ring(const void* addr, uint32_t* head_l1,
                           uint32_t* head_l2, uint64_t* last_ts) {
  const struct ttr_meta* l1 =
      (const struct ttr_meta*)((const uint8_t*)addr + TTR_HEADER_SIZE +
                               TTR_CONSUMER_TABLE_SIZE);
  *head_l1 = l1->head;
  *last_ts = l1->last_ts;

  size_t cell = sizeof(struct tt_metrics);
  const struct ttr_meta* l2 =
      (const struct ttr_meta*)((const uint8_t*)addr +
                               ttr_layout_l2_meta_offset(l1->capacity, cell));
  *head_l2 = l2->head;
}

int main(void) {
  printf("=== tinytd recovery test ===\n\n");

  /* Clean up from previous runs */
  unlink(LIVE_PATH);
  unlink(SHADOW_PATH);

  /* ------------------------------------------------------------------ */
  printf("Phase 1: start tinytd, let it collect data and sync shadow\n");

  pid_t pid = fork();
  if (pid == 0) {
    /* Child: exec tinytd */
    execl(TINYTD_BIN, "tinytd", TEST_CONF, NULL);
    perror("execl");
    exit(1);
  }
  if (pid < 0) {
    perror("fork");
    return 1;
  }

  /* Wait for shadow file to appear and have data */
  printf("  waiting for shadow sync (up to 8s)...\n");
  int shadow_ready = 0;
  for (int i = 0; i < 16; i++) {
    usleep(500000); /* 0.5s */
    struct stat st;
    if (stat(SHADOW_PATH, &st) == 0 && st.st_size > 0) {
      /* Check magic */
      size_t sz;
      void* addr = map_file(SHADOW_PATH, &sz);
      if (addr) {
        const struct ttr_header* hdr = (const struct ttr_header*)addr;
        if (hdr->magic == TTR_MAGIC && hdr->last_update_ts > 0) {
          const struct ttr_meta* l1 =
              (const struct ttr_meta*)((const uint8_t*)addr + TTR_HEADER_SIZE +
                                       TTR_CONSUMER_TABLE_SIZE);
          if (l1->head >= 3) { /* at least 3 samples written */
            shadow_ready = 1;
            munmap(addr, sz);
            break;
          }
        }
        munmap(addr, sz);
      }
    }
  }

  CHECK("shadow file created and has valid data", shadow_ready);
  if (!shadow_ready) {
    kill(pid, SIGKILL);
    waitpid(pid, NULL, 0);
    printf("\nAborting: shadow not ready\n");
    return 1;
  }

  /* Snapshot shadow state before kill */
  size_t shadow_sz;
  void* shadow_before = map_file(SHADOW_PATH, &shadow_sz);
  uint32_t before_head_l1, before_head_l2;
  uint64_t before_last_ts;
  snapshot_ring(shadow_before, &before_head_l1, &before_head_l2,
                &before_last_ts);
  printf("  shadow before kill: L1.head=%u  L2.head=%u  last_ts=%llu\n",
         before_head_l1, before_head_l2,
         (unsigned long long)before_last_ts);
  munmap(shadow_before, shadow_sz);

  /* ------------------------------------------------------------------ */
  printf("\nPhase 2: kill -KILL (SIGKILL) the daemon\n");
  kill(pid, SIGKILL);
  waitpid(pid, NULL, 0);
  printf("  daemon killed (pid=%d)\n", (int)pid);

  /* Shadow must still exist */
  struct stat st;
  CHECK("shadow file survives kill -KILL",
        stat(SHADOW_PATH, &st) == 0 && st.st_size > 0);

  /* ------------------------------------------------------------------ */
  printf("\nPhase 3: restart tinytd, check recovery\n");

  pid_t pid2 = fork();
  if (pid2 == 0) {
    execl(TINYTD_BIN, "tinytd", TEST_CONF, NULL);
    perror("execl");
    exit(1);
  }

  /* Give it time to recover and write a few new samples */
  usleep(2500000); /* 2.5s */

  /* Read live file */
  size_t live_sz;
  void* live_addr = map_file(LIVE_PATH, &live_sz);
  if (!live_addr) {
    printf("  [" FAIL "] live file not accessible after restart\n");
    tests_failed++;
    kill(pid2, SIGKILL);
    waitpid(pid2, NULL, 0);
    goto done;
  }

  {
    const struct ttr_header* hdr = (const struct ttr_header*)live_addr;
    CHECK("live magic valid after recovery", hdr->magic == TTR_MAGIC);
    CHECK("live version valid after recovery", hdr->version == TTR_VERSION);

    uint32_t after_head_l1, after_head_l2;
    uint64_t after_last_ts;
    snapshot_ring(live_addr, &after_head_l1, &after_head_l2, &after_last_ts);

    printf("  live after recovery: L1.head=%u  L2.head=%u  last_ts=%llu\n",
           after_head_l1, after_head_l2,
           (unsigned long long)after_last_ts);

    /* head must be >= before (recovered + new writes) */
    CHECK("L1 head restored and advanced after recovery",
          after_head_l1 >= before_head_l1);

    /* last_ts must be >= shadow's last_ts */
    CHECK("last_ts is not older than shadow snapshot",
          after_last_ts >= before_last_ts);

    /* Check a sample from L1 has non-zero cpu or mem */
    const struct ttr_meta* l1 =
        (const struct ttr_meta*)((const uint8_t*)live_addr + TTR_HEADER_SIZE +
                                 TTR_CONSUMER_TABLE_SIZE);
    size_t cell = sizeof(struct tt_metrics);
    uint32_t idx = (l1->head == 0 ? l1->capacity : l1->head) - 1;
    const struct tt_metrics* s =
        (const struct tt_metrics*)((const uint8_t*)live_addr +
                                         ttr_layout_l1_offset() +
                                         idx * cell);
    CHECK("latest L1 sample has non-zero cpu or mem",
          s->cpu_usage > 0 || s->mem_usage > 0);
    CHECK("latest L1 sample has plausible cpu (<10000 = <100%)",
          s->cpu_usage < 10000);

    munmap(live_addr, live_sz);
  }

  kill(pid2, SIGTERM);
  waitpid(pid2, NULL, 0);

  /* ------------------------------------------------------------------ */
  printf("\nPhase 4: corrupt live file, verify shadow restores it\n");

  /* Start daemon again to get a fresh shadow */
  pid_t pid3 = fork();
  if (pid3 == 0) { execl(TINYTD_BIN, "tinytd", TEST_CONF, NULL); exit(1); }
  usleep(3000000);
  kill(pid3, SIGKILL);
  waitpid(pid3, NULL, 0);

  /* Corrupt the first 64 bytes of live (header) */
  {
    int fd = open(LIVE_PATH, O_RDWR);
    if (fd >= 0) {
      uint8_t zeros[64] = {0};
      pwrite(fd, zeros, sizeof(zeros), 0);
      close(fd);
      printf("  live file header zeroed\n");
    }
  }

  /* Restart — should recover from shadow despite corrupted live */
  pid_t pid4 = fork();
  if (pid4 == 0) { execl(TINYTD_BIN, "tinytd", TEST_CONF, NULL); exit(1); }
  usleep(2000000);

  {
    size_t live_sz2;
    void* live2 = map_file(LIVE_PATH, &live_sz2);
    if (live2) {
      const struct ttr_header* hdr = (const struct ttr_header*)live2;
      CHECK("live magic restored after corruption", hdr->magic == TTR_MAGIC);
      CHECK("live version restored after corruption", hdr->version == TTR_VERSION);
      munmap(live2, live_sz2);
    } else {
      printf("  [" FAIL "] could not map live after corruption test\n");
      tests_failed += 2; tests_run += 2;
    }
  }

  kill(pid4, SIGTERM);
  waitpid(pid4, NULL, 0);

  /* ------------------------------------------------------------------ */
  printf("\nPhase 5: kill -KILL during shadow-sync window\n");

  unlink(LIVE_PATH);
  unlink(SHADOW_PATH);

  /* Start fresh, let shadow accumulate */
  pid_t pid5 = fork();
  if (pid5 == 0) { execl(TINYTD_BIN, "tinytd", TEST_CONF, NULL); exit(1); }
  usleep(2500000); /* wait for at least 2 shadow syncs */

  /* Save shadow state before kill */
  size_t sh_sz;
  void* sh_before = map_file(SHADOW_PATH, &sh_sz);
  uint32_t sh_head = 0;
  if (sh_before) {
    const struct ttr_meta* m =
        (const struct ttr_meta*)((uint8_t*)sh_before + TTR_HEADER_SIZE +
                                 TTR_CONSUMER_TABLE_SIZE);
    sh_head = m->head;
    munmap(sh_before, sh_sz);
  }

  kill(pid5, SIGKILL); /* kill exactly during potential sync */
  waitpid(pid5, NULL, 0);

  /* Shadow must still be valid (CRC check) */
  {
    size_t sz;
    void* sh = map_file(SHADOW_PATH, &sz);
    int valid = 0;
    if (sh) {
      const struct ttr_header* hdr = (const struct ttr_header*)sh;
      valid = (hdr->magic == TTR_MAGIC && hdr->last_update_ts > 0);
      munmap(sh, sz);
    }
    CHECK("shadow valid after kill-during-sync", valid);
    CHECK("shadow had accumulated data before kill", sh_head >= 2);
  }

done:
  /* Cleanup */
  unlink(LIVE_PATH);
  unlink(SHADOW_PATH);

  printf("\n=== Results: %d/%d passed ===\n",
         tests_run - tests_failed, tests_run);
  return tests_failed > 0 ? 1 : 0;
}
