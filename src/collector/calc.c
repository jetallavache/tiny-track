#include "calc.h"

#include <fcntl.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/socket.h>
#include <sys/statvfs.h>
#include <time.h>
#include <unistd.h>
// #include <sys/stat.h>

#include "../service/log.h"
#include "../utils/util.h"
#include "state.h"

int direct_statvfs(const char* path, struct statvfs* buf) {
#if SYS_statvfs != 0
  return syscall(SYS_statvfs, path, buf);
#else
  return statvfs(path, buf)
#endif
}

void* mmap_create(ssize_t bufsize, const char* path) {
  int fd;
  void* buffer;
  ssize_t len;
  if ((buffer = mmap(NULL, bufsize, PROT_READ | PROT_WRITE,
                     MAP_PRIVATE | MAP_ANONYMOUS, -1, 0)) == MAP_FAILED) {
    printf("MAP_FAILED: %s\n", strerror(errno));
  } else if ((fd = open(path, O_RDONLY)) == (-1)) {
    printf("OPEN_FD: %s\n", strerror(errno));
  } else if ((len = read(fd, buffer, bufsize - 1)) == (-1)) {
    printf("READ_FD: %s\n", strerror(errno));
  } else {
    ((char*)buffer)[len] = '\0';
  }
  if (fd != (-1)) close(fd);
  return buffer;
}

void mmap_delete(void* buf, ssize_t size) {
  if (buf) munmap(buf, size);
}
// L_ERROR(("epoll_create1 errno %d", errno));
// L_DEBUG(("MG_IO_SIZE: %lu, TLS: --", S_IO_SIZE));
void sscanf_err(int c, int nvals) {
  if (c >= 0 && c < nvals) {
    L_ERROR(("sscanf incorrect conversions"));
  } else if (c < 0) {
    L_ERROR(("sscanf errno %d", errno));
  }
}

bool readpr_stat(struct c_stat* ps) {
  bool success = true;
  void* buffer;
  int n;
  if (!(buffer = mmap_create(M_STAT_BSIZE, M_STAT_PATH))) {
    success = false;
  } else {
    n = sscanf((char*)buffer, "cpu %lu %lu %lu %lu %lu %lu %lu", &ps->user,
               &ps->nice, &ps->system, &ps->idle, &ps->iowait, &ps->irq,
               &ps->softirq);
    sscanf_err(n, 7);
    if (n != 7) success = false;
  }
  mmap_delete(buffer, M_STAT_BSIZE);
  return success;
}

bool readpr_meminf(struct c_meminfo* pm) {
  bool success = true;
  void* buffer;
  int n;
  if (!(buffer = mmap_create(M_MEMINFO_BSIZE, M_MEMINFO_PATH))) {
    success = false;
  } else {
    char* ln = (char*)buffer;
    if (strstr(ln, "MemTotal:")) {
      n = sscanf(ln, "MemTotal: %lu", &pm->total);
      sscanf_err(n, 1);
      if (n != 1) success = false;
      NEXT_LINE(ln);
    }
    if (strstr(ln, "MemFree:")) {
      n = sscanf(ln, "MemFree: %lu", &pm->free);
      sscanf_err(n, 1);
      if (n != 1) success = false;
      NEXT_LINE(ln);
    }
    if (strstr(ln, "MemAvailable:")) {
      n = sscanf(ln, "MemAvailable: %lu", &pm->available);
      sscanf_err(n, 1);
      if (n != 1) success = false;
      NEXT_LINE(ln);
    }
  }
  mmap_delete(buffer, M_MEMINFO_BSIZE);
  return success;
}

bool readpr_net(struct c_net* pn) {
  void* buffer;
  bool success = true;
  int n;
  if (!(buffer = mmap_create(M_NET_BSIZE, M_NET_PATH))) {
    success = false;
  } else {
    char* ln = (char*)buffer;
    NEXT_LINE(ln);
    NEXT_LINE(ln);
    while (*ln != '\0') {
      char iface[32];
      unsigned long rx, tx;
      if ((n = sscanf(ln, "%31[^:]: %lu %*u %*u %*u %*u %*u %*u %*u %lu", iface,
                      &rx, &tx)) == 3) {
        if (!strstr(iface, "lo")) {
          pn->rx_bytes += rx;
          pn->tx_bytes += tx;
        }
      } else {
        sscanf_err(n, 3);
        if (n != 3) success = false;
      }
      NEXT_LINE(ln);
    }
  }
  mmap_delete(buffer, M_NET_BSIZE);
  return success;
}

bool readpr_lavg(struct c_loadavg* pl) {
  void* buffer;
  bool success = true;
  int n;
  if (!(buffer = mmap_create(M_LOADAVG_BSIZE, M_LOADAVG_PATH))) {
    success = false;
  } else {
    n = sscanf((char*)buffer, "%f %f %f %d/%d", &pl->load_1min, &pl->load_5min,
               &pl->load_15min, &pl->nr_running, &pl->nr_total);
    sscanf_err(n, 5);
    if (n != 5) success = false;
  }
  mmap_delete(buffer, M_LOADAVG_BSIZE);
  return success;
}

struct c_du readfs_du(const char* path) {
  struct c_du du = {0};
  struct statvfs fs;
  if (direct_statvfs(path, &fs) != 0) {
    L_ERROR(("direct_statvfs() errno %d", errno));
  } else {
    unsigned long total = (unsigned long)fs.f_blocks * fs.f_frsize;
    unsigned long free = (unsigned long)fs.f_bfree * fs.f_frsize;
    if (total > 0) {
      du.total_bytes = total;
      du.free_bytes = free;
      du.usage = (float)(((float)(total - free) / total) * 100 * 100);
    }
  }
  return du;
}

struct c_du du_cached(struct c_state* st) {
  time_t now = time(NULL);
  if (now - st->du_last_update >= st->du_inval) {
    st->du_cached = readfs_du(st->du_path);
    st->du_last_update = now;
  }
  return st->du_cached;
}

float c_calc_cpu_usage(struct c_state* st) {
  unsigned long ctotal, ptotal, cwork, pwork, difftotal, diffwork;
  float usage = 0.0;
  struct c_stat curr = {0};
  if (!readpr_stat(&curr)) {
    L_ERROR(("readpr_stat() error!"));
  } else {
    ctotal = curr.user + curr.nice + curr.system + curr.idle + curr.iowait +
             curr.irq + curr.softirq;
    ptotal = st->stat_prev.user + st->stat_prev.nice + st->stat_prev.system +
             st->stat_prev.idle + st->stat_prev.iowait + st->stat_prev.irq +
             st->stat_prev.softirq;
    cwork = curr.idle;
    pwork = st->stat_prev.idle;
    diffwork = cwork - pwork;
    difftotal = ctotal - ptotal;
    st->stat_prev = curr;
    if (difftotal == 0)
      usage = 0.0;
    else {
      usage = (1 - (float)diffwork / difftotal) * 100.0;
      usage = usage > 100.0 ? 100.0 : usage;
    }
  }
  return usage;
}

float c_calc_memory_usage() {
  float usage = 0.0;
  struct c_meminfo curr = {0};
  if (!readpr_meminf(&curr)) {
    L_ERROR(("readpr_meminf() error!"));
  } else {
    if (curr.total == 0)
      usage = 0.0;
    else {
      unsigned long used = curr.total - curr.available;
      usage = ((float)(used) / curr.total) * 100.0;
      usage = usage > 100.0 ? 100.0 : usage;
    }
  }
  return usage;
}

void c_calc_net(struct c_state* st, unsigned long* rx, unsigned long* tx) {
  struct c_net curr = {0};
  if (!readpr_net(&curr)) {
    L_ERROR(("readpr_net() error!"));
  } else {
    time_t now = time(NULL);
    if (st->net_time_prev != 0) {
      time_t diff = now - st->net_time_prev;
      if (diff > 0) {
        *rx = (curr.rx_bytes - st->net_prev.rx_bytes) / diff;
        *tx = (curr.tx_bytes - st->net_prev.tx_bytes) / diff;
      } else {
        *rx = *tx = 0;
      }
    } else {
      *rx = *tx = 0;
    }
    st->net_prev = curr;
    st->net_time_prev = now;
  }
}

struct c_loadavg c_calc_loadavg() {
  struct c_loadavg curr = {0};
  if (!readpr_lavg(&curr)) {
    L_ERROR(("readpr_lavg() error!"));
  }
  return curr;
}

struct c_du c_calc_disk_usage(struct c_state* st) {
  struct c_du du = du_cached(st);
  return du;
}