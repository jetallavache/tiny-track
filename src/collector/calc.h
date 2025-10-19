#ifndef SRC_M_CALC_H
#define SRC_M_CALC_H

#include <errno.h>
#include <stdbool.h>
#include <sys/syscall.h>

// #include "c_state.h"

#ifndef SYS_statvfs
#if defined(__x86_64__)
#define SYS_statvfs 137
#elif defined(__i386__)
#define SYS_statvfs 99
#elif defined(__arm__)
#define SYS_statvfs 266
#elif defined(__aarch64__)
#define SYS_statvfs 43
#else
#define SYS_statvfs 0
#endif
#endif

#define M_STAT_BSIZE 100
#define M_MEMINFO_BSIZE 100
#define M_NET_BSIZE 1000
#define M_LOADAVG_BSIZE 30
#define M_STAT_PATH "/proc/stat"
#define M_MEMINFO_PATH "/proc/meminfo"
#define M_NET_PATH "/proc/net/dev"
#define M_LOADAVG_PATH "/proc/loadavg"

struct c_stat {
  unsigned long user;
  unsigned long nice;
  unsigned long system;
  unsigned long idle;
  unsigned long iowait;
  unsigned long irq;
  unsigned long softirq;
};

struct c_meminfo {
  unsigned long total;
  unsigned long free;
  unsigned long available;
};

struct c_net {
  unsigned long rx_bytes; /* Received bytes */
  unsigned long tx_bytes; /* Transmitted bytes */
};

struct c_loadavg {
  float load_1min;
  float load_5min;
  float load_15min;
  int nr_running;
  int nr_total;
};

struct c_du {
  float usage;               /* Usage percentage */
  unsigned long total_bytes; /* Total space in bytes */
  unsigned long free_bytes;  /* Available space in bytes */
};

struct c_state;
float c_calc_cpu_usage(struct c_state*);
float c_calc_memory_usage();
void c_calc_net(struct c_state*, unsigned long* rx, unsigned long* tx);
struct c_loadavg c_calc_loadavg();
struct c_du c_calc_disk_usage(struct c_state*);

#endif  // SRC_M_CALC_H