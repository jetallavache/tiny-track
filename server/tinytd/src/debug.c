#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#ifdef TTD_DEBUG

#include <stdio.h>
#include <sys/resource.h>
#include <time.h>

#include "common/ringbuf.h"
#include "debug.h"

static void fmt_ts(uint64_t ts_ms, char* buf, size_t len) {
  if (ts_ms == 0) {
    snprintf(buf, len, " (none) ");
    return;
  }
  time_t t = (time_t)(ts_ms / 1000);
  struct tm* tm = localtime(&t);
  strftime(buf, len, "%H:%M:%S", tm);
}

void ttd_debug_dump_collector(const struct tt_metrics* s) {
  char ts[16];
  fmt_ts(s->timestamp, ts, sizeof(ts));

  fprintf(stderr,
          "[DBG collect] ts=%s  cpu=%5.2f%%  mem=%5.2f%%  rx=%5u  tx=%5u  "
          "load=%5.2f/%5.2f/%5.2f  du=%.2f%%\n",
          ts, s->cpu_usage / 100.0, s->mem_usage / 100.0, s->net_rx, s->net_tx,
          s->load_1min / 100.0, s->load_5min / 100.0, s->load_15min / 100.0, s->du_usage / 100.0);
}

void ttd_debug_dump_l1(const void* live_addr, uint32_t l1_capacity) {
  size_t cell_size = sizeof(struct tt_metrics);

  const struct ttr_meta* meta = (const struct ttr_meta*)((const uint8_t*)live_addr +
                                                         TTR_HEADER_SIZE + TTR_CONSUMER_TABLE_SIZE);
  const uint8_t* data = (const uint8_t*)live_addr + ttr_layout_l1_offset();

  uint32_t head = meta->head;
  uint32_t filled = head < l1_capacity ? head : l1_capacity;

  /* Print last 3 L1 entries */
  uint32_t show = filled < 3 ? filled : 3;
  fprintf(stderr, "[DBG L1     ] head=%u  filled=%u/%u  last %u entries:\n", head, filled,
          l1_capacity, show);

  for (uint32_t i = 0; i < show; i++) {
    uint32_t idx = (head - show + i + l1_capacity) % l1_capacity;
    const struct tt_metrics* s = (const struct tt_metrics*)(data + idx * cell_size);
    char ts[16];
    fmt_ts(s->timestamp, ts, sizeof(ts));
    fprintf(stderr,
            "[%3u        ] ts=%s  cpu=%5.2f%%  mem=%5.2f%%  rx=%5u  tx=%5u  "
            "load=%5.2f/%5.2f/%5.2f  du=%.2f%%\n",
            idx, ts, s->cpu_usage / 100.0, s->mem_usage / 100.0, s->net_rx, s->net_tx,
            s->load_1min / 100.0, s->load_5min / 100.0, s->load_15min / 100.0, s->du_usage / 100.0);
  }
}

void ttd_debug_dump_agg(int level, const struct tt_metrics* agg, uint32_t head, uint32_t capacity) {
  (void)head;
  (void)capacity;
  char ts[16];
  fmt_ts(agg->timestamp, ts, sizeof(ts));
  fprintf(stderr,
          "[DBG L%d agg] ts=%s  cpu=%5.2f%%  mem=%5.2f%%  rx=%5u  tx=%5u  "
          "load=%5.2f/%5.2f/%5.2f  du=%.2f%%\n",
          level, ts, agg->cpu_usage / 100.0, agg->mem_usage / 100.0, agg->net_rx, agg->net_tx,
          agg->load_1min / 100.0, agg->load_5min / 100.0, agg->load_15min / 100.0,
          agg->du_usage / 100.0);
}

void ttd_debug_dump_rusage(void) {
  struct rusage ru;
  if (getrusage(RUSAGE_SELF, &ru) < 0) return;
  fprintf(stderr,
          "[DBG rusage ] minflt=%ld majflt=%ld"
          "  nvcsw=%ld nivcsw=%ld  inblock=%ld oublock=%ld\n",
          ru.ru_minflt, ru.ru_majflt, ru.ru_nvcsw, ru.ru_nivcsw, ru.ru_inblock, ru.ru_oublock);
}

#endif /* TTD_DEBUG */
