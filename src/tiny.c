#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#include "m_pack.h"
#include "s_event.h"
#include "s_http.h"
#include "s_net.h"
#include "s_printf.h"
#include "s_timer.h"
#include "s_ws.h"
#include "util.h"

/*
char buffer[26] = {0};
    time_t t = (time_t)mgr->packet.timestamp;
    struct tm *tm_info = localtime(&t);
    strftime(buffer, 26, "%Y-%m-%d %H:%M:%S", tm_info);
    s_ws_printf(c, WS_OP_TEXT, "{tm: %s, cpu: %5.2f, mem: %5.2f}", buffer,
                (float)mgr->metrics.cpu_usage / 100,
                (float)mgr->metrics.mem_usage / 100);
*/

static const char *s_listen_on = "ws://localhost:4083";
// static const char *s_web_root = "web_root";

static void timer_fn(void *arg) {
  struct s_mgr *mgr = (struct s_mgr *)arg;
  // Broadcast message to all connected websocket clients.

  m_pack_metrics_update(&mgr->packet.metrics, &mgr->state);

  //  mgr->packet.header.checksum = util_checksum(
  //   (struct m_pack_full *)&mgr->packet, sizeof(struct m_pack_full) - 1);

  for (struct s_conn *c = mgr->conns; c != NULL; c = c->next) {
    if (c->data[0] != 'W') continue;
    
    L_DEBUG(("full packet sizeof %d", sizeof(mgr->packet)));

    s_ws_send(c, &mgr->packet, sizeof(mgr->packet), WS_OP_BINARY);
  }
}

static void fn(struct s_conn *c, int ev, void *ev_data) {
  if (ev == S_EVENT_OPEN) {
    // c->is_hexdumping = 1;
  } else if (ev == S_EVENT_WS_OPEN) {
    /* Отметьте это соединение как установленного клиента WS */
    c->data[0] = 'W';
  } else if (ev == S_EVENT_HTTP_MSG) {
    struct s_http_message *hm = (struct s_http_message *)ev_data;
    if (str_match(hm->uri, str("/websocket"), NULL)) {
      /** Upgrade to websocket.
       * Отныне подключение является полнодуплексным подключением Websocket,
       * которое будет получать события S_EVENT_WS_MSG.
       * */
      s_ws_upgrade(c, hm, NULL);
    } else if (str_match(hm->uri, str("/rest"), NULL)) {
      // Serve REST response
      s_http_reply(c, 200, "", "{\"result\": %d}\n", 123);
    } else {
      // Serve static files
      // struct s_http_serve_opts opts = {.root_dir = s_web_root};
      // s_http_serve_dir(c, ev_data, &opts);
    }
  } else if (ev == S_EVENT_WS_MSG) {
    // Got websocket frame. Received data is wm->data

    struct s_ws_message *wm = (struct s_ws_message *)ev_data;
    s_ws_send(c, wm->data.buf, wm->data.len, WS_OP_TEXT);

    // struct s_iobuf io = {0, 0, 0, 512};
    // struct s_rpc_req r = {&s_rpc_head, 0, s_pfn_iobuf, &io, 0, wm->data};
    // s_rpc_process(&r);
    // if (io.buf) s_ws_send(c, (char *)io.buf, io.len, WS_OP_TEXT);
    // s_iobuf_free(&io);
  }
}

int main(void) {
  struct s_mgr mgr;

  s_net_mgr_init(&mgr);
  log_set(LL_DEBUG);

  s_net_timer_add(&mgr, 500, S_TIMER_REPEAT, timer_fn, &mgr); /* 100, 500, 1000, 5000*/

  printf("Starting WS listener on %s/websocket\n", s_listen_on);

  s_http_listen(&mgr, s_listen_on, fn, NULL);

  for (;;) {
    s_net_mgr_poll(&mgr, 500); /* 100, 500, 1000, 5000*/
  }

  s_net_mgr_free(&mgr);
  return 0;
}