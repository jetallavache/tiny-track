#include "collector.h"

#include <fcntl.h>
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <sys/statvfs.h>
#include <sys/syscall.h>
#include <time.h>
#include <unistd.h>

#define NEXT_LINE(ptr)             \
  while (*(ptr) && *(ptr) != '\n') \
    (ptr)++;                       \
  if (*(ptr))                      \
    (ptr)++;

/* Persistent file descriptors for /proc files */
static int g_stat_fd = -1;
static int g_meminfo_fd = -1;
static int g_loadavg_fd = -1;
static int g_net_fd = -1;

void ttd_collector_init(void) {
  g_stat_fd = open(TTD_STAT_PATH, O_RDONLY | O_CLOEXEC);
  g_meminfo_fd = open(TTD_MEMINFO_PATH, O_RDONLY | O_CLOEXEC);
  g_loadavg_fd = open(TTD_LOADAVG_PATH, O_RDONLY | O_CLOEXEC);
  g_net_fd = open(TTD_NET_PATH, O_RDONLY | O_CLOEXEC);
}

void ttd_collector_cleanup(void) {
  if (g_stat_fd >= 0)
    close(g_stat_fd);
  if (g_meminfo_fd >= 0)
    close(g_meminfo_fd);
  if (g_loadavg_fd >= 0)
    close(g_loadavg_fd);
  if (g_net_fd >= 0)
    close(g_net_fd);
}

int direct_statvfs(const char* path, struct statvfs* buf) {
#if SYS_statvfs != 0
  return syscall(SYS_statvfs, path, buf);
#else
  return statvfs(path, buf);
#endif
}

bool readpr_stat(struct ttd_collector_stat* ps) {
  if (g_stat_fd < 0)
    return false;

  char buf[512];
  lseek(g_stat_fd, 0, SEEK_SET);
  ssize_t n = read(g_stat_fd, buf, sizeof(buf) - 1);
  if (n <= 0)
    return false;
  buf[n] = '\0';

  int parsed =
      sscanf(buf, "cpu %lu %lu %lu %lu %lu %lu %lu", &ps->user, &ps->nice,
             &ps->system, &ps->idle, &ps->iowait, &ps->irq, &ps->softirq);
  return (parsed == 7);
}

bool readpr_meminf(struct ttd_collector_meminfo* pm) {
  if (g_meminfo_fd < 0)
    return false;

  char buf[2048];
  lseek(g_meminfo_fd, 0, SEEK_SET);
  ssize_t n = read(g_meminfo_fd, buf, sizeof(buf) - 1);
  if (n <= 0)
    return false;
  buf[n] = '\0';

  bool found_total = false, found_free = false, found_avail = false;
  char* line = buf;
  char* end = buf + n;

  while (line < end) {
    if (sscanf(line, "MemTotal: %lu", &pm->total) == 1)
      found_total = true;
    else if (sscanf(line, "MemFree: %lu", &pm->free) == 1)
      found_free = true;
    else if (sscanf(line, "MemAvailable: %lu", &pm->available) == 1)
      found_avail = true;

    if (found_total && found_free && found_avail)
      break;

    NEXT_LINE(line);
  }

  return (found_total && found_free && found_avail);
}

bool readpr_net(struct ttd_collector_net* pn) {
  if (g_net_fd < 0)
    return false;

  char buf[4096];
  lseek(g_net_fd, 0, SEEK_SET);
  ssize_t n = read(g_net_fd, buf, sizeof(buf) - 1);
  if (n <= 0)
    return false;
  buf[n] = '\0';

  pn->rx_bytes = 0;
  pn->tx_bytes = 0;

  char* line = buf;
  char* end = buf + n;

  /* Skip header lines */
  NEXT_LINE(line);
  NEXT_LINE(line);

  while (line < end && *line) {
    char iface[32];
    unsigned long rx, tx;
    unsigned long dummy[14];

    if (sscanf(line,
               "%31[^:]: %lu %lu %lu %lu %lu %lu %lu %lu %lu %lu %lu %lu %lu "
               "%lu %lu %lu",
               iface, &rx, &dummy[0], &dummy[1], &dummy[2], &dummy[3],
               &dummy[4], &dummy[5], &dummy[6], &tx, &dummy[7], &dummy[8],
               &dummy[9], &dummy[10], &dummy[11], &dummy[12],
               &dummy[13]) >= 10) {
      if (strcmp(iface, "lo") != 0) {
        pn->rx_bytes += rx;
        pn->tx_bytes += tx;
      }
    }
    NEXT_LINE(line);
  }
  return true;
}

bool readpr_loadavg(struct ttd_collector_loadavg* pl) {
  if (g_loadavg_fd < 0)
    return false;

  char buf[128];
  lseek(g_loadavg_fd, 0, SEEK_SET);
  ssize_t n = read(g_loadavg_fd, buf, sizeof(buf) - 1);
  if (n <= 0)
    return false;
  buf[n] = '\0';

  int parsed = sscanf(buf, "%f %f %f %d/%d", &pl->load_1min, &pl->load_5min,
                      &pl->load_15min, &pl->nr_running, &pl->nr_total);
  return (parsed == 5);
}

float ttd_collect_cpu(struct ttd_collector_state* st) {
  struct ttd_collector_stat curr;
  if (!readpr_stat(&curr))
    return 0.0f;

  unsigned long prev_idle = st->stat_prev.idle + st->stat_prev.iowait;
  unsigned long curr_idle = curr.idle + curr.iowait;

  unsigned long prev_total = st->stat_prev.user + st->stat_prev.nice +
                             st->stat_prev.system + st->stat_prev.idle +
                             st->stat_prev.iowait + st->stat_prev.irq +
                             st->stat_prev.softirq;
  unsigned long curr_total = curr.user + curr.nice + curr.system + curr.idle +
                             curr.iowait + curr.irq + curr.softirq;

  unsigned long total_diff = curr_total - prev_total;
  unsigned long idle_diff = curr_idle - prev_idle;

  st->stat_prev = curr;

  if (total_diff == 0)
    return 0.0f;
  return (float)(total_diff - idle_diff) * 100.0f / total_diff;
}

float ttd_collect_memory(void) {
  struct ttd_collector_meminfo mem;
  if (!readpr_meminf(&mem))
    return 0.0f;

  if (mem.total == 0)
    return 0.0f;
  return (float)(mem.total - mem.available) * 100.0f / mem.total;
}

void ttd_collect_net(struct ttd_collector_state* st, unsigned long* rx,
                     unsigned long* tx) {
  struct ttd_collector_net curr;
  if (!readpr_net(&curr)) {
    *rx = *tx = 0;
    return;
  }

  time_t now = time(NULL);
  time_t elapsed = now - st->net_time_prev;

  if (elapsed > 0 && st->net_time_prev > 0) {
    *rx = (curr.rx_bytes - st->net_prev.rx_bytes) / elapsed;
    *tx = (curr.tx_bytes - st->net_prev.tx_bytes) / elapsed;
  } else {
    *rx = *tx = 0;
  }

  st->net_prev = curr;
  st->net_time_prev = now;
}

struct ttd_collector_loadavg ttd_collect_loadavg(void) {
  struct ttd_collector_loadavg load = {0};
  readpr_loadavg(&load);
  return load;
}

struct ttd_collector_du ttd_collect_disk(struct ttd_collector_state* st) {
  struct ttd_collector_du result = {0};

  time_t now = time(NULL);
  if (st->du_last_update > 0 && (now - st->du_last_update) < st->du_inval) {
    return st->du_cached;
  }

  struct statvfs vfs;
  if (direct_statvfs(st->du_path, &vfs) != 0) {
    return result;
  }

  unsigned long total = vfs.f_blocks * vfs.f_frsize;
  unsigned long free = vfs.f_bavail * vfs.f_frsize;

  result.total_bytes = total;
  result.free_bytes = free;
  result.usage = (total > 0) ? (float)(total - free) * 100.0f / total : 0.0f;

  st->du_cached = result;
  st->du_last_update = now;

  return result;
}
