#ifndef TTD_DEBUG_H
#define TTD_DEBUG_H

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#ifdef TTD_DEBUG

#include "collector.h"
#include "common/proto/v1.h"
#include "common/ringbuf.h"

/* Dump raw /proc collector state after each read */
void ttd_debug_dump_collector(const struct tt_proto_metrics* sample);

/* Dump L1 ring buffer state after write */
void ttd_debug_dump_l1(const void* live_addr, uint32_t l1_capacity);

/* Dump aggregated sample and ring state after L2/L3 aggregation */
void ttd_debug_dump_agg(int level, const struct tt_proto_metrics* agg,
                        uint32_t head, uint32_t capacity);

#else

#define ttd_debug_dump_collector(s)       ((void)0)
#define ttd_debug_dump_l1(addr, cap)      ((void)0)
#define ttd_debug_dump_agg(lvl, agg, h, c) ((void)0)

#endif /* TTD_DEBUG */

#endif /* TTD_DEBUG_H */
