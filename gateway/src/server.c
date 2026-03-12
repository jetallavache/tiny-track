#include "server.h"

#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

#include "http.h"
#include "net.h"
#include "reader.h"
#include "ws.h"

static struct tt_gateway_reader g_reader;
static volatile sig_atomic_t g_running = 1;

static void signal_handler(int sig) {
  (void)sig;
  g_running = 0;
}

/* HTTP handler for /api/metrics/live */
static void handle_metrics_live(struct ttg_conn* c, int ev, void* ev_data) {
  if (ev == TTG_EVENT_HTTP_MSG) {
    struct ttg_http_message* hm = (struct ttg_http_message*)ev_data;

    /* Check if URI matches /api/metrics/live */
    if (hm->uri.len == 18 &&
        memcmp(hm->uri.buf, "/api/metrics/live", 18) == 0) {
      struct tt_proto_metrics m;
      if (tt_gateway_reader_get_latest(&g_reader, &m) == 0) {
        ttg_net_printf(c,
                       "HTTP/1.1 200 OK\r\n"
                       "Content-Type: application/json\r\n"
                       "Access-Control-Allow-Origin: *\r\n"
                       "\r\n"
                       "{\"cpu\":%u,\"mem\":%u,\"load1\":%u,\"rx\":%lu,\"tx\":%"
                       "lu}\r\n",
                       m.cpu_usage, m.mem_usage, m.load_1min, m.net_rx,
                       m.net_tx);
      } else {
        ttg_net_printf(c,
                       "HTTP/1.1 503 Service Unavailable\r\n"
                       "Content-Type: text/plain\r\n\r\n"
                       "No data available\r\n");
      }
      c->is_draining = 1;
    } else {
      ttg_net_printf(c,
                     "HTTP/1.1 404 Not Found\r\n"
                     "Content-Type: text/plain\r\n\r\n"
                     "Not Found\r\n");
      c->is_draining = 1;
    }
  }
}

int tt_gateway_run(struct tt_gateway_config* cfg) {
  printf("Starting tinytrack gateway on %s:%d\n", cfg->bind_addr, cfg->port);

  /* Open mmap */
  if (tt_gateway_reader_open(&g_reader, cfg->mmap_path) < 0) {
    fprintf(stderr, "Failed to open mmap: %s\n", cfg->mmap_path);
    return -1;
  }

  /* Setup signal handlers */
  signal(SIGTERM, signal_handler);
  signal(SIGINT, signal_handler);
  signal(SIGPIPE, SIG_IGN);

  /* Create network manager */
  struct ttg_mgr mgr;
  ttg_net_mgr_init(&mgr);

  /* Create listen URL */
  char listen_url[128];
  snprintf(listen_url, sizeof(listen_url), "http://%s:%d", cfg->bind_addr,
           cfg->port);

  /* Start HTTP listener */
  ttg_http_listen(&mgr, listen_url, handle_metrics_live, NULL);

  printf("Gateway running, press Ctrl+C to stop\n");

  /* Event loop */
  while (g_running) {
    ttg_net_mgr_poll(&mgr, 1000);
  }

  printf("Shutting down...\n");

  /* Cleanup */
  tt_gateway_reader_close(&g_reader);

  return 0;
}
