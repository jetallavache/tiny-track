#ifndef TTD_DEBUG_H
#define TTD_DEBUG_H

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#ifdef TTD_DEBUG

#include "collector.h"
#include "common/metrics.h"
#include "common/ringbuf.h"

/* Dump raw /proc collector state after each read */
void ttd_debug_dump_collector(const struct tt_metrics* sample);

/* Dump L1 ring buffer state after write */
void ttd_debug_dump_l1(const void* live_addr, uint32_t l1_capacity);

/* Dump aggregated sample written to L2 or L3 after aggregation */
void ttd_debug_dump_agg(int level, const struct tt_metrics* agg, uint32_t head,
                        uint32_t capacity);

/* Dump page faults, context switches via getrusage */
void ttd_debug_dump_rusage(void);

#else

#define ttd_debug_dump_collector(s) ((void)0)
#define ttd_debug_dump_l1(addr, cap) ((void)0)
#define ttd_debug_dump_agg(lvl, agg, h, c) ((void)0)
#define ttd_debug_dump_rusage() ((void)0)

#endif /* TTD_DEBUG */

#endif /* TTD_DEBUG_H */
