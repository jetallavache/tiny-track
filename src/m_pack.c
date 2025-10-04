#include "m_pack.h"

#include <string.h>
#include <time.h>

#include "log.h"
#include "util.h"

void set_metrics(struct m_pack_metrics *m, struct m_state *s) {
  struct calc_loadavg lo;
  struct calc_du du;
  unsigned long rx, tx;
  m_calc_net(s, &rx, &tx);
  lo = m_calc_loadavg();
  du = m_calc_disk_usage(s);
  m->cpu_usage = (uint16_t)(m_calc_cpu_usage(s) * 100.0);
  m->mem_usage = (uint16_t)(m_calc_memory_usage() * 100.0);
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

void set_flags(struct m_pack_metrics *m) {
  uint8_t flags = 0;
  long cores = sysconf(_SC_NPROCESSORS_ONLN);
  if (m->cpu_usage > 9000) flags |= M_FLAG_HIGH_CPU;
  if (m->mem_usage > 9000) flags |= M_FLAG_HIGH_MEM;
  if (m->load_1min > cores * 200) flags |= M_FLAG_HIGH_LOAD;
  if (m->load_1min < m->load_5min && m->load_1min < m->load_15min)
    flags |= M_FLAG_LOAD_FALL;
  if (m->load_1min > m->load_5min && m->load_1min > m->load_15min)
    flags |= M_FLAG_LOAD_GROW;
  if (m->net_rx == 0) flags |= M_FLAG_NETWORK_DOWN;
  if (m->du_usage > 9000) flags |= M_FLAG_DISK_FULL;
  if (SHIFT_GB(m->du_free_bytes) < 1) flags |= M_FLAG_DISK_LOW;
  m->flags = flags;
}

void m_pack_header_init(struct m_pack_header *header, uint16_t packet_type,
                        size_t data_len) {
  header->magic = 0xAA;
  header->version = 1;
  header->packet_type = packet_type;
  header->timestamp = (uint32_t)time(NULL);
  header->data_length = data_len;
  header->checksum = util_checksum(header, sizeof(struct m_pack_header) - 1);
}

void m_pack_full_init(struct m_pack_full *m) {
  memset(m, 0, sizeof(*m));
  memset(&m->metrics, 0, sizeof(m->metrics));
  m_pack_header_init(&m->header, M_PACKET_METRICS,
                     sizeof(struct m_pack_metrics));

  char buffer[26];
  time_t t = (time_t)m->header.timestamp;
  struct tm *tm_info = localtime(&t);
  strftime(buffer, 26, "%Y-%m-%d %H:%M:%S", tm_info);
  L_DEBUG(("header %hhu v.%hhu %hu %s %hu %hhu", m->header.magic, m->header.version,
          m->header.packet_type, buffer, m->header.data_length, m->header.checksum));
}

void m_pack_metrics_update(struct m_pack_metrics *m, struct m_state *s) {
  m->timestamp = (uint32_t)time(NULL);
  set_metrics(m, s);
  set_flags(m);

  L_DEBUG(
      ("snd %4.1f%% %4.1f%% %6.4lf/%6.4lf %4.1f %4.1f %4.1f "
       "%3d/%4d %6.2f%%/%4.1f/%4.1f " BYTE_TO_BIN_PATTERN "",
       (float)m->cpu_usage / 100, (float)m->mem_usage / 100,
       (double)m->net_rx / 8000, (double)m->net_tx / 8000,
       (float)m->load_1min / 100, (float)m->load_5min / 100,
       (float)m->load_15min / 100, (int)m->nr_running, (int)m->nr_total,
       (float)m->du_usage / 100, SHIFT_GB((float)m->du_total_bytes),
       SHIFT_GB((float)m->du_free_bytes), BYTE_TO_BIN(m->flags)));
}