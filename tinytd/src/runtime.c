#include "runtime.h"

#include <errno.h>
#include <string.h>
#include <sys/epoll.h>
#include <sys/time.h>
#include <unistd.h>

#include "common/log.h"
#include "common/timer.h"

static uint64_t now_ms(void) {
  struct timeval tv;
  gettimeofday(&tv, NULL);
  return (uint64_t)tv.tv_sec * 1000 + tv.tv_usec / 1000;
}

static void collect_metrics(struct ttd_state* state,
                            struct tt_proto_metrics* sample) {
  if (!state || !sample) {
    tt_log_err("Invalid parameters to collect_metrics");
    return;
  }

  sample->cpu_usage = (uint16_t)(ttd_collect_cpu(state) * 100);
  sample->mem_usage = (uint16_t)(ttd_collect_memory() * 100);

  unsigned long rx, tx;
  ttd_collect_net(state, &rx, &tx);
  sample->net_rx = rx;
  sample->net_tx = tx;

  struct ttd_collector_loadavg load = ttd_collect_loadavg();
  sample->load_1min = (uint16_t)(load.load_1min * 100);
  sample->load_5min = (uint16_t)(load.load_5min * 100);
  sample->load_15min = (uint16_t)(load.load_15min * 100);
  sample->nr_running = load.nr_running;
  sample->nr_total = load.nr_total;

  struct ttd_collector_du du = ttd_collect_disk(state);
  sample->du_usage = (uint16_t)(du.usage * 100);
  sample->du_total_bytes = du.total_bytes;
  sample->du_free_bytes = du.free_bytes;
}

int ttd_runtime_init(struct ttd_runtime* rt, struct ttd_config* cfg,
                     struct ttd_state* state, struct ttd_writer* writer) {
  if (!rt || !cfg || !state || !writer) {
    tt_log_err("Invalid parameters to ttd_runtime_init");
    return -1;
  }

  rt->epoll_fd = -1;
  rt->timer_fd = -1;
  rt->cfg = cfg;
  rt->state = state;
  rt->writer = writer;
  rt->next_l2 = 0;
  rt->next_l3 = 0;
  rt->next_shadow = 0;

  tt_log_debug("Runtime init: rt=%p, cfg=%p, state=%p, writer=%p", (void*)rt,
               (void*)cfg, (void*)state, (void*)writer);

  /* Create epoll */
  rt->epoll_fd = epoll_create1(EPOLL_CLOEXEC);
  if (rt->epoll_fd < 0) {
    tt_log_err("Failed to create epoll");
    return -1;
  }

  /* Create timer */
  rt->timer_fd = tt_timerfd_create(cfg->interval_ms);
  if (rt->timer_fd < 0) {
    tt_log_err("Failed to create timer");
    close(rt->epoll_fd);
    return -1;
  }

  /* Add timer to epoll */
  struct epoll_event ev = {.events = EPOLLIN, .data.fd = rt->timer_fd};
  if (epoll_ctl(rt->epoll_fd, EPOLL_CTL_ADD, rt->timer_fd, &ev) < 0) {
    tt_log_err("Failed to add timer to epoll");
    close(rt->timer_fd);
    close(rt->epoll_fd);
    return -1;
  }

  return 0;
}

void ttd_runtime_poll(struct ttd_runtime* rt, int timeout_ms) {
  struct epoll_event events[1];

  if (!rt || !rt->writer) {
    tt_log_err("Invalid runtime state: rt=%p, writer=%p", (void*)rt,
               rt ? (void*)rt->writer : NULL);
    return;
  }

  int nfds = epoll_wait(rt->epoll_fd, events, 1, timeout_ms);
  if (nfds < 0 && errno != EINTR) {
    tt_log_err("epoll_wait failed: %s", strerror(errno));
    return;
  }

  uint64_t now = now_ms();

  /* Handle timer event */
  if (nfds > 0 && events[0].data.fd == rt->timer_fd) {
    uint64_t expirations;
    read(rt->timer_fd, &expirations, sizeof(expirations));

    tt_log_debug("Timer fired, collecting metrics (rt=%p, writer=%p)",
                 (void*)rt, (void*)rt->writer);

    struct tt_proto_metrics sample = {0};
    collect_metrics(rt->state, &sample);

    tt_log_debug("Metrics collected, writing to L1");

    ttd_writer_write_l1(rt->writer, &sample);

    tt_log_debug("L1 write complete");
  }

  /* Periodic tasks */
  if (tt_timer_expired(&rt->next_l2, rt->cfg->l2_aggregate_interval * 1000,
                       now)) {
    ttd_writer_aggregate_l2(rt->writer);
  }

  if (tt_timer_expired(&rt->next_l3, rt->cfg->l3_aggregate_interval * 1000,
                       now)) {
    ttd_writer_aggregate_l3(rt->writer);
  }

  if (tt_timer_expired(&rt->next_shadow,
                       rt->cfg->shadow_sync_interval_sec * 1000, now)) {
    ttd_writer_shadow_sync(rt->writer);
  }
}

void ttd_runtime_free(struct ttd_runtime* rt) {
  if (rt->timer_fd >= 0) {
    close(rt->timer_fd);
    rt->timer_fd = -1;
  }
  if (rt->epoll_fd >= 0) {
    close(rt->epoll_fd);
    rt->epoll_fd = -1;
  }
}
