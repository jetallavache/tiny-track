#include "session.h"

#include <arpa/inet.h>
#include <stdio.h>
#include <string.h>
#include <time.h>

#include "common/log/log.h"
#include "common/proto/v1.h"
#include "common/proto/v2.h"
#include "http.h"
#include "proto.h"
#include "str.h"
#include "ws.h"

#define WS_MARK 'W'

static struct ttg_reader* g_reader;

void ttg_session_init(struct ttg_reader* reader) { g_reader = reader; }

static void send_metrics(struct ttg_conn* c) {
  struct tt_metrics m;
  int ret;

  if (c->sub_level == RING_LEVEL_L1 || c->sub_level == 0) {
    ret = ttg_reader_get_latest(g_reader, &m);
  } else {
    ret = ttg_reader_get_history(g_reader, c->sub_level, &m, 1);
    if (ret == 1) ret = 0;
  }
  if (ret != 0) return;

  uint8_t buf[sizeof(struct tt_proto_header) + sizeof(m)];
  size_t n = ttg_proto_build(buf, sizeof(buf), TT_PROTO_V1, PKT_METRICS,
                             (uint32_t)(m.timestamp / 1000), &m, sizeof(m));
  if (n > 0) ttg_ws_send(c, buf, n, TTG_WS_OP_BINARY);
}

static void send_history(struct ttg_conn* c, const struct tt_proto_history_req* req) {
  uint16_t max = ntohs(req->max_count);
  if (max == 0 || max > TT_HISTORY_BATCH_MAX * 10) max = TT_HISTORY_BATCH_MAX * 10;

  int remaining = max;
  struct tt_metrics samples[TT_HISTORY_BATCH_MAX];

  while (remaining > 0) {
    int batch = remaining < TT_HISTORY_BATCH_MAX ? remaining : TT_HISTORY_BATCH_MAX;
    int got = ttg_reader_get_history(g_reader, req->level, samples, batch);
    if (got <= 0) break;

    remaining -= got;
    int is_last = (remaining <= 0 || got < batch);

    struct tt_proto_history_resp resp = {
        .level = req->level,
        .count = htons((uint16_t)got),
        .flags = is_last ? HISTORY_FLAG_LAST : 0,
    };

    uint8_t payload[sizeof(resp) + TT_HISTORY_BATCH_MAX * sizeof(*samples)];
    memcpy(payload, &resp, sizeof(resp));
    memcpy(payload + sizeof(resp), samples, (size_t)got * sizeof(*samples));

    uint8_t buf[sizeof(struct tt_proto_header) + sizeof(payload)];
    size_t n =
        ttg_proto_build(buf, sizeof(buf), TT_PROTO_V2, PKT_HISTORY_RESP, (uint32_t)time(NULL),
                        payload, (uint16_t)(sizeof(resp) + (size_t)got * sizeof(*samples)));
    if (n > 0) ttg_ws_send(c, buf, n, TTG_WS_OP_BINARY);
  }
}

static void send_stats(struct ttg_conn* c) {
  struct tt_proto_stats stats;
  ttg_reader_get_stats(g_reader, RING_LEVEL_L1, &stats.l1);
  ttg_reader_get_stats(g_reader, RING_LEVEL_L2, &stats.l2);
  ttg_reader_get_stats(g_reader, RING_LEVEL_L3, &stats.l3);

  uint8_t buf[sizeof(struct tt_proto_header) + sizeof(stats)];
  size_t n = ttg_proto_build(buf, sizeof(buf), TT_PROTO_V2, PKT_RING_STATS, (uint32_t)time(NULL),
                             &stats, sizeof(stats));
  if (n > 0) ttg_ws_send(c, buf, n, TTG_WS_OP_BINARY);
}

static void handle_subscribe(struct ttg_conn* c, const struct tt_proto_subscribe* sub) {
  struct tt_proto_ack ack = {.cmd_type = PKT_SUBSCRIBE, .status = ACK_OK};

  if (sub->level < RING_LEVEL_L1 || sub->level > RING_LEVEL_L3) {
    ack.status = ACK_ERROR;
  } else {
    c->sub_level = sub->level;
    uint32_t ms = ntohl(sub->interval_ms);
    if (ms >= 1000 && ms <= 60000) c->update_interval_ms = ms;
    tt_log_info("Client subscribed to level %u @ %u ms", c->sub_level, c->update_interval_ms);
  }

  uint8_t buf[sizeof(struct tt_proto_header) + sizeof(ack)];
  size_t n = ttg_proto_build(buf, sizeof(buf), TT_PROTO_V2, PKT_ACK, (uint32_t)time(NULL), &ack,
                             sizeof(ack));
  if (n > 0) ttg_ws_send(c, buf, n, TTG_WS_OP_BINARY);
}

static void send_sysinfo(struct ttg_conn* c) {
  struct tt_proto_sysinfo info;
  ttg_reader_get_sysinfo(g_reader, &info);

  uint8_t buf[sizeof(struct tt_proto_header) + sizeof(info)];
  size_t n = ttg_proto_build(buf, sizeof(buf), TT_PROTO_V2, PKT_SYS_INFO, (uint32_t)time(NULL),
                             &info, sizeof(info));
  if (n > 0) ttg_ws_send(c, buf, n, TTG_WS_OP_BINARY);
}

static void handle_cmd(struct ttg_conn* c, const struct tt_proto_cmd* cmd) {
  struct tt_proto_ack ack = {.cmd_type = cmd->cmd_type, .status = ACK_OK};

  if (cmd->cmd_type == CMD_SET_INTERVAL) {
    uint32_t ms = ntohl(cmd->interval_ms);
    if (ms >= 1000 && ms <= 60000) {
      c->update_interval_ms = ms;
      tt_log_info("Client interval set to %u ms", ms);
    } else {
      ack.status = ACK_ERROR;
    }
  } else if (cmd->cmd_type == CMD_SET_ALERTS) {
    tt_log_info("Client alerts_enabled=%u", cmd->alerts_enabled);
  } else if (cmd->cmd_type == CMD_GET_SNAPSHOT) {
    send_metrics(c);
  } else if (cmd->cmd_type == CMD_GET_RING_STATS) {
    send_stats(c);
  } else if (cmd->cmd_type == CMD_GET_SYS_INFO) {
    send_sysinfo(c);
  } else if (cmd->cmd_type == CMD_START) {
    c->streaming_paused = 0;
    tt_log_info("Client streaming resumed");
  } else if (cmd->cmd_type == CMD_STOP) {
    c->streaming_paused = 1;
    tt_log_info("Client streaming paused");
  } else {
    ack.status = ACK_ERROR;
  }

  uint8_t buf[sizeof(struct tt_proto_header) + sizeof(ack)];
  size_t n = ttg_proto_build(buf, sizeof(buf), TT_PROTO_V1, PKT_ACK, (uint32_t)time(NULL), &ack,
                             sizeof(ack));
  if (n > 0) ttg_ws_send(c, buf, n, TTG_WS_OP_BINARY);
}

static void on_ws_message(struct ttg_conn* c, const void* data, size_t len) {
  if (len < sizeof(struct tt_proto_header)) return;

  const struct tt_proto_header* hdr = (const struct tt_proto_header*)data;
  if (ttg_proto_validate(hdr) != 0) return;

  const uint8_t* payload = (const uint8_t*)data + sizeof(*hdr);

  if (hdr->type == PKT_HISTORY_REQ) {
    if (len >= sizeof(*hdr) + sizeof(struct tt_proto_history_req))
      send_history(c, (const struct tt_proto_history_req*)payload);
  } else if (hdr->type == PKT_SUBSCRIBE) {
    if (len >= sizeof(*hdr) + sizeof(struct tt_proto_subscribe))
      handle_subscribe(c, (const struct tt_proto_subscribe*)payload);
  } else if (hdr->type == PKT_CMD) {
    if (len >= sizeof(*hdr) + sizeof(struct tt_proto_cmd))
      handle_cmd(c, (const struct tt_proto_cmd*)payload);
  }
}

static void on_ws_open(struct ttg_conn* c) {
  c->data[0] = WS_MARK;
  c->update_interval_ms = 1000;
  c->last_update_time = 0;
  c->sub_level = RING_LEVEL_L1;
  c->streaming_paused = 0;

  tt_log_info("WebSocket client connected");

  struct tt_proto_config cfg = {
      .interval_ms = htonl(c->update_interval_ms),
      .alerts_enabled = 0,
  };
  uint8_t buf[sizeof(struct tt_proto_header) + sizeof(cfg)];
  size_t n = ttg_proto_build(buf, sizeof(buf), TT_PROTO_V1, PKT_CONFIG, (uint32_t)time(NULL), &cfg,
                             sizeof(cfg));
  if (n > 0) ttg_ws_send(c, buf, n, TTG_WS_OP_BINARY);
}

static void on_http(struct ttg_conn* c, struct ttg_http_message* hm) {
  if (ttg_str_match(hm->uri, str("/websocket"), NULL)) {
    ttg_ws_upgrade(c, hm, NULL);
    return;
  }

  if (ttg_str_match(hm->uri, str("/api/metrics/live"), NULL)) {
    struct tt_metrics m;
    if (ttg_reader_get_latest(g_reader, &m) == 0) {
      char buf[512];
      snprintf(buf, sizeof(buf), "{\"cpu\":%u,\"mem\":%u,\"load1\":%u,\"rx\":%u,\"tx\":%u}",
               m.cpu_usage, m.mem_usage, m.load_1min, m.net_rx, m.net_tx);
      ttg_http_reply(c, 200, "Content-Type: application/json\r\n", "%s", buf);
    } else {
      ttg_http_reply(c, 503, "", "{\"error\":\"No data available\"}");
    }
    return;
  }

  ttg_http_reply(c, 404, "", "Not Found\n");
}

void ttg_session_event_fn(struct ttg_conn* c, int ev, void* ev_data) {
  if (ev == TTG_EVENT_WS_OPEN) {
    on_ws_open(c);
  } else if (ev == TTG_EVENT_HTTP_MSG) {
    on_http(c, (struct ttg_http_message*)ev_data);
  } else if (ev == TTG_EVENT_WS_MSG) {
    struct ttg_ws_message* wm = (struct ttg_ws_message*)ev_data;
    on_ws_message(c, wm->data.buf, wm->data.len);
  }
}

void ttg_session_timer_fn(void* arg) {
  struct ttg_mgr* mgr = (struct ttg_mgr*)arg;
  time_t now = time(NULL);

  for (struct ttg_conn* c = mgr->conns; c != NULL; c = c->next) {
    if (c->data[0] != WS_MARK) continue;
    if (c->streaming_paused) continue;
    if (now - c->last_update_time >= (time_t)(c->update_interval_ms / 1000)) {
      send_metrics(c);
      c->last_update_time = now;
    }
  }
}
