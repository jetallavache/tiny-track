#include "proto.h"

#include <netinet/in.h>
#include <string.h>
#include <time.h>

#include "common/proto/v1.h"

uint8_t ttg_proto_checksum(const struct tt_proto_header* hdr) {
  /* XOR all header bytes; treat checksum byte as 0 */
  const uint8_t* b = (const uint8_t*)hdr;
  uint8_t cs = 0;
  for (size_t i = 0; i < sizeof(*hdr); i++) {
    if (i != offsetof(struct tt_proto_header, checksum))
      cs ^= b[i];
  }
  return cs;
}

int ttg_proto_validate(const struct tt_proto_header* hdr) {
  if (hdr->magic != TT_PROTO_MAGIC)
    return -1;
  if (hdr->version != TT_PROTO_V1 && hdr->version != TT_PROTO_V2)
    return -1;
  if (ttg_proto_checksum(hdr) != hdr->checksum)
    return -1;
  return 0;
}

size_t ttg_proto_build(void* buf, size_t buf_size, uint8_t version,
                       uint8_t type, uint32_t timestamp, const void* payload,
                       uint16_t payload_len) {
  size_t total = sizeof(struct tt_proto_header) + payload_len;
  if (buf_size < total)
    return 0;

  struct tt_proto_header* hdr = (struct tt_proto_header*)buf;
  hdr->magic = TT_PROTO_MAGIC;
  hdr->version = version;
  hdr->type = type;
  hdr->length = htons(payload_len);
  hdr->timestamp = htonl(timestamp);
  hdr->checksum = 0;
  hdr->checksum = ttg_proto_checksum(hdr);

  if (payload_len > 0)
    memcpy((uint8_t*)buf + sizeof(*hdr), payload, payload_len);

  return total;
}
