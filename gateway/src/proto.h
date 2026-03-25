#ifndef TTG_PROTO_H
#define TTG_PROTO_H

#include <stddef.h>
#include <stdint.h>

#include "common/proto/v2.h"

/*
 * Compute XOR checksum over all header bytes (checksum field treated as 0).
 */
uint8_t ttg_proto_checksum(const struct tt_proto_header *hdr);

/*
 * Validate header: magic, version (v1 or v2), and checksum.
 * Returns 0 on success, -1 on failure.
 */
int ttg_proto_validate(const struct tt_proto_header *hdr);

/*
 * Write a complete binary frame (header + payload) into buf.
 * Returns total frame size, or 0 if buf is too small.
 */
size_t ttg_proto_build(void *buf, size_t buf_size, uint8_t version,
                       uint8_t type, uint32_t timestamp,
                       const void *payload, uint16_t payload_len);

#endif /* TTG_PROTO_H */
