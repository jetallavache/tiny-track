#include "display.h"

#include <stdio.h>
#include <time.h>

static void format_timestamp(uint64_t ts_ms, char* buf, size_t size) {
  time_t ts_sec = ts_ms / 1000;
  struct tm* tm_info = localtime(&ts_sec);
  strftime(buf, size, "%H:%M:%S", tm_info);
}

void ttc_display_metrics(struct tt_metrics* m) {
  char time_buf[32];
  format_timestamp(m->timestamp, time_buf, sizeof(time_buf));

  printf("[%s]\n", time_buf);
  printf("CPU:  %5.2f%%\n", m->cpu_usage / 100.0);
  printf("MEM:  %5.2f%%\n", m->mem_usage / 100.0);
  printf("NET:  RX %u B/s  TX %u B/s\n", m->net_rx, m->net_tx);
  printf("LOAD: %.2f %.2f %.2f\n", m->load_1min / 100.0, m->load_5min / 100.0,
         m->load_15min / 100.0);
  printf("PROC: %u/%u\n", m->nr_running, m->nr_total);
  printf("DISK: %5.2f%% (%lu / %lu bytes)\n", m->du_usage / 100.0,
         m->du_free_bytes, m->du_total_bytes);
}

void ttc_display_metrics_json(struct tt_metrics* m) {
  printf("{\n");
  printf("  \"timestamp\": %lu,\n", m->timestamp);
  printf("  \"cpu\": %.2f,\n", m->cpu_usage / 100.0);
  printf("  \"mem\": %.2f,\n", m->mem_usage / 100.0);
  printf("  \"net_rx\": %u,\n", m->net_rx);
  printf("  \"net_tx\": %u,\n", m->net_tx);
  printf("  \"load_1min\": %.2f,\n", m->load_1min / 100.0);
  printf("  \"load_5min\": %.2f,\n", m->load_5min / 100.0);
  printf("  \"load_15min\": %.2f,\n", m->load_15min / 100.0);
  printf("  \"nr_running\": %u,\n", m->nr_running);
  printf("  \"nr_total\": %u,\n", m->nr_total);
  printf("  \"du_usage\": %.2f,\n", m->du_usage / 100.0);
  printf("  \"du_total\": %lu,\n", m->du_total_bytes);
  printf("  \"du_free\": %lu\n", m->du_free_bytes);
  printf("}\n");
}

void ttc_display_metrics_compact(struct tt_metrics* m) {
  char time_buf[32];
  format_timestamp(m->timestamp, time_buf, sizeof(time_buf));

  printf("[%s] CPU:%5.2f%% MEM:%5.2f%% LOAD:%.2f NET:↓%u↑%u\n", time_buf,
         m->cpu_usage / 100.0, m->mem_usage / 100.0, m->load_1min / 100.0,
         m->net_rx, m->net_tx);
}
