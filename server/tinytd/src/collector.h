#ifndef TTD_COLLECTOR_H
#define TTD_COLLECTOR_H

#include <errno.h>
#include <stdbool.h>
#include <time.h>

#include "common/sysfs.h"

#define TTD_STAT_BSIZE 100
#define TTD_MEMINFO_BSIZE 100
#define TTD_NET_BSIZE 1000
#define TTD_LOADAVG_BSIZE 30

/* Paths are now resolved at runtime via tt_sysfs_*() — see common/sysfs.h */

/* Structure of the /proc/stat data unit */
struct ttd_collector_stat {
  unsigned long user;
  unsigned long nice;
  unsigned long system;
  unsigned long idle;
  unsigned long iowait;
  unsigned long irq;
  unsigned long softirq;
};

/* Structure of the /proc/meminfo data unit */
struct ttd_collector_meminfo {
  unsigned long total;
  unsigned long free;
  unsigned long available;
};

/* Structure of the /proc/net data unit */
struct ttd_collector_net {
  unsigned long rx_bytes; /* Received bytes */
  unsigned long tx_bytes; /* Transmitted bytes */
};

/* Structure of the /proc/loadavg data unit */
struct ttd_collector_loadavg {
  float load_1min;
  float load_5min;
  float load_15min;
  int nr_running;
  int nr_total;
};

/* Structure of the direct_statvfs data unit */
struct ttd_collector_du {
  float usage;               /* Usage percentage */
  unsigned long total_bytes; /* Total space in bytes */
  unsigned long free_bytes;  /* Available space in bytes */
};

/* State of collector node */
struct ttd_collector_state {
  struct ttd_collector_stat stat_prev;
  struct ttd_collector_net net_prev;
  time_t net_time_prev;
  struct ttd_collector_du du_cached;
  time_t du_last_update;
  time_t du_inval;
};

float ttd_collect_cpu(struct ttd_collector_state* st);
float ttd_collect_memory(void);
void ttd_collect_net(struct ttd_collector_state* st, unsigned long* rx, unsigned long* tx);
struct ttd_collector_loadavg ttd_collect_loadavg(void);
struct ttd_collector_du ttd_collect_disk(struct ttd_collector_state* st);

/* Initialize/cleanup persistent file descriptors */
void ttd_collector_init(void);
void ttd_collector_cleanup(void);

#endif /* TTD_COLLECTOR_H */