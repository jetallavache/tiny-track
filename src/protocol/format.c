#include "format.h"

#include <netinet/in.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "../service/log.h"

inline void* p_build_packet(uint8_t type, const void* payload, uint16_t length,
                            uint16_t* out_size) {
  uint16_t total_size = sizeof(struct p_packet_header) + length;
  struct p_packet_header* pkt = malloc(total_size);

  pkt->magic = 0xAA;
  pkt->version = 1;
  pkt->type = type;
  pkt->length = htons(length); /* Network byte order */
  pkt->timestamp = (uint32_t)time(NULL);
  pkt->checksum =
      0; /* util_checksum(pkt, sizeof(struct p_packet_header) - 1); */

  memcpy(((uint8_t*)pkt) + sizeof(*pkt), payload, length);
  *out_size = total_size;
  return pkt;
}

int p_parse_header(const uint8_t* data, size_t len,
                   struct p_packet_header* hdr) {
  if (len < sizeof(struct p_packet_header)) return -1;
  memcpy(hdr, data, sizeof(*hdr));
  hdr->length = ntohs(hdr->length);
  return 0;
}
