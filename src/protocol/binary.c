#include "binary.h"

#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "../api/ws.h"
#include "../collector/calc.h"
#include "../collector/ring.h"
#include "../service/log.h"
#include "../utils/util.h"
#include "format.h"

void set_metrics(struct p_metrics_payload* m, struct c_state* s) {
  struct c_loadavg lo;
  struct c_du du;
  unsigned long rx, tx;

  c_calc_net(s, &rx, &tx);
  lo = c_calc_loadavg();
  du = c_calc_disk_usage(s);
  m->cpu_usage = (uint16_t)(c_calc_cpu_usage(s) * 100.0);
  m->mem_usage = (uint16_t)(c_calc_memory_usage() * 100.0);
  m->net_rx = (uint32_t)rx;
  m->net_tx = (uint32_t)tx;
  m->load_1min = (uint16_t)(lo.load_1min * 100.0);
  m->load_5min = (uint16_t)(lo.load_5min * 100.0);
  m->load_15min = (uint16_t)(lo.load_15min * 100.0);
  m->nr_running = (uint32_t)lo.nr_running;
  m->nr_total = (uint32_t)lo.nr_total;
  m->du_usage = (uint16_t)du.usage;
  m->du_total_bytes = (uint64_t)du.total_bytes;
  m->du_free_bytes = (uint64_t)du.free_bytes;
}

// void set_flags(struct p_metrics_payload *m) {
//   uint8_t flags = 0;
//   long cores = sysconf(_SC_NPROCESSORS_ONLN);
//   if (m->cpu_usage > 9000) flags |= M_FLAG_HIGH_CPU;
//   if (m->mem_usage > 9000) flags |= M_FLAG_HIGH_MEM;
//   if (m->load_1min > cores * 200) flags |= M_FLAG_HIGH_LOAD;
//   if (m->load_1min < m->load_5min && m->load_1min < m->load_15min)
//     flags |= M_FLAG_LOAD_FALL;
//   if (m->load_1min > m->load_5min && m->load_1min > m->load_15min)
//     flags |= M_FLAG_LOAD_GROW;
//   if (m->net_rx == 0) flags |= M_FLAG_NETWORK_DOWN;
//   if (m->du_usage > 9000) flags |= M_FLAG_DISK_FULL;
//   if (SHIFT_GB(m->du_free_bytes) < 1) flags |= M_FLAG_DISK_LOW;
//   m->flags = flags;
// }

// void p_bin_full_init(struct p_full *m) {
//   memset(m, 0, sizeof(*m));
//   memset(&m->metrics, 0, sizeof(m->metrics));
//   p_bin_header_init(&m->header, M_PACKET_METRICS,
//                      sizeof(struct p_metrics_payload));
//   char buffer[26];
//   time_t t = (time_t)m->header.timestamp;
//   struct tm *tm_info = localtime(&t);
//   strftime(buffer, 26, "%Y-%m-%d %H:%M:%S", tm_info);
//   L_DEBUG(("header %hhu v.%hhu %hu %s %hu %hhu", m->header.magic,
//   m->header.version,
//           m->header.packet_type, buffer, m->header.data_length,
//           m->header.checksum));
// }

// * Periodically

void p_send_metrics(struct s_conn* c) {
  uint16_t size;
  struct p_metrics_payload m = {};
  set_metrics(&m, &c->mgr->state);

  /* TODO: The client s_conn *s will have an interval specified, here we will process it, and also whether to send him alerts or not? */

  L_DEBUG(
      ("snd %4.1f%% %4.1f%% %6.4lf/%6.4lf %4.1f %4.1f %4.1f "
       "%3d/%4d %6.2f%%/%4.1f/%4.1f", /* " BYTE_TO_BIN_PATTERN " */
       (float)m.cpu_usage / 100, (float)m.mem_usage / 100,
       (double)m.net_rx / 8000, (double)m.net_tx / 8000,
       (float)m.load_1min / 100, (float)m.load_5min / 100,
       (float)m.load_15min / 100, (int)m.nr_running, (int)m.nr_total,
       (float)m.du_usage / 100, SHIFT_GB((float)m.du_total_bytes),
       SHIFT_GB((float)m.du_free_bytes) /* , BYTE_TO_BIN(m.flags) */));

  void* buf = p_build_packet(PKT_METRICS, &m, sizeof(m), &size);
  api_ws_send(c, &buf, size, WS_OP_BINARY);
  free(buf);
}

// ? Immediately after connection

void p_send_config(struct s_conn* c) {
  struct p_config_payload cfg = {.interval_ms = 1000, .alerts_enabled = 1};
  uint16_t size;

  void* buf = p_build_packet(PKT_CONFIG, &cfg, sizeof(cfg), &size);
  api_ws_send(c, &buf, size, WS_OP_BINARY);
  free(buf);
}

// ? By event

void p_send_alert() {}

// ? By command

void p_send_ack() {}

// ? Immediately after connection

void p_send_history() {}

void p_handle_client_message(const uint8_t* data, size_t len) {
  struct p_packet_header hdr;
  if (p_parse_header(data, len, &hdr) != 0) return;

  const uint8_t* payload = data + sizeof(hdr);

/**
  Server:
  1. Checks the command.
  2. Applies the changes.
  3. Can send `PKT_ACK` to let the client know that the command has been applied.
*/
  switch (hdr.type) {
    case PKT_CMD: {
      if (hdr.length < sizeof(struct p_cmd_payload)) return;
      struct p_cmd_payload cmd;
      memcpy(&cmd, payload, sizeof(cmd));

      if (cmd.cmd_type == CMD_SET_INTERVAL) {
        L_INFO(("New interval = %u ms\n", cmd.interval_ms));
        /* Change the interval in the client config */
      } else if (cmd.cmd_type == CMD_SET_ALERTS) {
        L_INFO(("Alerts enabled = %u\n", cmd.alerts_enabled));
        /* Enable notifications in the client config */
      } else if (cmd.cmd_type == CMD_GET_SNAPSHOT) {
        /* Send metrics one time */
      }
      break;
    }
    default:
      L_INFO(("Unknown packet type %d\n", hdr.type));
  }
}

void p_handle_cmd_get_history(struct s_conn* c, struct p_cmd_payload* cmd,
                              struct c_metrics_ring* ring) {
  /* Let's say cmd contains from/to + metric_type for simplicity let's add them
   * directly to union cmd_payload */

  uint64_t from = cmd->from_ts;
  uint64_t to = cmd->to_ts;
  uint8_t metric = cmd->metric_type;

  struct p_history_point points[1000]; /* Limit of points in a packet */
  int n = c_ring_history_get(ring, from, to, metric, points, 1000);

  size_t payload_size =
      sizeof(struct p_history_payload) + n * sizeof(struct p_history_point);
  struct p_history_payload* hp = malloc(payload_size);
  hp->metric_type = metric;
  hp->count = n;
  memcpy(hp->points, points, n * sizeof(struct p_history_point));

  uint16_t pkt_size;
  void* pkt = p_build_packet(PKT_HISTORY, hp, payload_size, &pkt_size);
  api_ws_send(c, &pkt, pkt_size, WS_OP_BINARY);

  free(hp);
  free(pkt);
}