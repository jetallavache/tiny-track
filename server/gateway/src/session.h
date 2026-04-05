#ifndef TTG_SESSION_H
#define TTG_SESSION_H

#include "net.h"
#include "reader.h"

/*
 * WebSocket session handler.
 * ttg_session_init() must be called once before use.
 * ttg_session_event_fn() is passed directly to ttg_http_listen().
 * ttg_session_timer_fn() is passed to ttg_net_timer_add().
 */

void ttg_session_init(struct ttg_reader* reader);

void ttg_session_event_fn(struct ttg_conn* c, int ev, void* ev_data);
void ttg_session_timer_fn(void* arg);

#endif /* TTG_SESSION_H */
