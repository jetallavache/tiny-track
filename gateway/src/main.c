#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "common/log.h"
#include "common/timer.h"
#include "event.h"
#include "http.h"
#include "net.h"
#include "printf.h"
#include "reader.h"
#include "ws.h"

static const char* s_listen_on = "ws://localhost:4026";
static const char* s_mmap_path = "/tmp/tinytd-live.dat";
static struct ttg_reader g_reader;

/* Send metrics to WebSocket client */
static void send_metrics(struct ttg_conn* c) {
  struct tt_proto_metrics m;

  if (ttg_reader_get_latest(&g_reader, &m) != 0) {
    return; /* No data available */
  }

  /* Format JSON */
  char buf[512];
  snprintf(buf, sizeof(buf),
           "{\"cpu\":%u,\"mem\":%u,\"load1\":%u,\"load5\":%u,\"load15\":%u,"
           "\"rx\":%u,\"tx\":%u,\"disk\":%u}",
           m.cpu_usage, m.mem_usage, m.load_1min, m.load_5min, m.load_15min,
           m.net_rx, m.net_tx, m.du_usage);

  ttg_ws_send(c, buf, strlen(buf), TTG_WS_OP_TEXT);
}

static void timer_fn(void* arg) {
  struct ttg_mgr* mgr = (struct ttg_mgr*)arg;
  time_t now = time(NULL);

  /* Broadcast metrics to all connected websocket clients */
  for (struct ttg_conn* c = mgr->conns; c != NULL; c = c->next) {
    if (c->data[0] != 'W')
      continue; /* Not a WebSocket client */

    /* Check if it's time to send update based on client's interval */
    if (now - c->last_update_time >= (time_t)(c->update_interval_ms / 1000)) {
      send_metrics(c);
      c->last_update_time = now;
    }
  }
}

/* Handle client configuration message */
static void handle_client_config(struct ttg_conn* c, const char* msg,
                                 size_t len) {
  /* Simple JSON parsing: {"interval":5000} */
  const char* interval_key = "\"interval\":";
  const char* p = strstr(msg, interval_key);

  if (p) {
    p += strlen(interval_key);
    uint32_t interval = atoi(p);

    /* Validate interval (1-60 seconds) */
    if (interval >= 1000 && interval <= 60000) {
      c->update_interval_ms = interval;
      tt_log_info("Client interval set to %u ms", interval);

      /* Send ACK */
      char ack[64];
      snprintf(ack, sizeof(ack), "{\"status\":\"ok\",\"interval\":%u}",
               interval);
      ttg_ws_send(c, ack, strlen(ack), TTG_WS_OP_TEXT);
    }
  }
}

static void fn(struct ttg_conn* c, int ev, void* ev_data) {
  if (ev == TTG_EVENT_OPEN) {
    /* Connection opened */
  } else if (ev == TTG_EVENT_WS_OPEN) {
    /* Mark this connection as established WS client */
    c->data[0] = 'W';

    /* Set default interval: 1 second */
    c->update_interval_ms = 1000;
    c->last_update_time = 0; /* Send immediately on first timer */

    tt_log_info("WebSocket client connected");

    /* Send welcome message */
    const char* welcome = "{\"type\":\"welcome\",\"version\":\"0.1.0\"}";
    ttg_ws_send(c, welcome, strlen(welcome), TTG_WS_OP_TEXT);

  } else if (ev == TTG_EVENT_HTTP_MSG) {
    struct ttg_http_message* hm = (struct ttg_http_message*)ev_data;

    if (ttg_str_match(hm->uri, str("/websocket"), NULL)) {
      /* Upgrade to websocket */
      ttg_ws_upgrade(c, hm, NULL);
    } else if (ttg_str_match(hm->uri, str("/api/metrics/live"), NULL)) {
      /* REST API: get latest metrics */
      struct tt_proto_metrics m;
      if (ttg_reader_get_latest(&g_reader, &m) == 0) {
        char buf[512];
        snprintf(buf, sizeof(buf),
                 "{\"cpu\":%u,\"mem\":%u,\"load1\":%u,\"rx\":%u,\"tx\":%u}",
                 m.cpu_usage, m.mem_usage, m.load_1min, m.net_rx, m.net_tx);
        ttg_http_reply(c, 200, "Content-Type: application/json\r\n", "%s", buf);
      } else {
        ttg_http_reply(c, 503, "", "{\"error\":\"No data available\"}");
      }
    } else {
      /* 404 */
      ttg_http_reply(c, 404, "", "Not Found\n");
    }

  } else if (ev == TTG_EVENT_WS_MSG) {
    /* Got websocket frame */
    struct ttg_ws_message* wm = (struct ttg_ws_message*)ev_data;

    /* Handle client configuration */
    handle_client_config(c, wm->data.buf, wm->data.len);
  }
}

int main(void) {
  struct ttg_mgr mgr;

  ttg_net_mgr_init(&mgr);

  tt_log_config_t log_cfg = {.backend = TT_LOG_BACKEND_STDOUT,
                             .min_level = TT_LOG_DEBUG,
                             .ident = "tinytrack",
                             .async = false};
  tt_log_init(&log_cfg);
  tt_log_notice("tinytrack gateway starting...");

  /* Open mmap reader */
  if (ttg_reader_open(&g_reader, s_mmap_path) != 0) {
    tt_log_err("Failed to open mmap: %s", s_mmap_path);
    return 1;
  }
  tt_log_info("Opened mmap: %s", s_mmap_path);

  /* Timer for broadcasting metrics (check every 500ms) */
  ttg_net_timer_add(&mgr, 500, TIMER_REPEAT, timer_fn, &mgr);

  tt_log_info("WS listener on %s/websocket", s_listen_on);
  tt_log_info("HTTP API on %s/api/metrics/live", s_listen_on);

  ttg_http_listen(&mgr, s_listen_on, fn, NULL);

  for (;;) {
    ttg_net_mgr_poll(&mgr, 500);
  }

  ttg_net_mgr_free(&mgr);
  ttg_reader_close(&g_reader);
  tt_log_notice("tinytrack gateway shutting down...");

  return 0;
}
