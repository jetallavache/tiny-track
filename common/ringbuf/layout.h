#ifndef TT_RING_LAYOUT_H
#define TT_RING_LAYOUT_H

#include <stdatomic.h>
#include <stddef.h>
#include <stdint.h>

/* Magic number for validation */
#define TT_MAGIC 0x544D5452 /* "TMTR" */
#define TT_VERSION 1

/* Block sizes */
#define TT_HEADER_SIZE 256
#define TT_CONSUMER_TABLE_SIZE 2048
#define TT_RING_META_SIZE 64
#define TT_MAX_CONSUMERS 32

/* Main file header - 256 bytes */
struct tt_ring_header {
  uint32_t magic;          /* TT_MAGIC */
  uint32_t version;        /* TT_VERSION */
  uint32_t crc32;          /* CRC32 of the entire file */
  uint64_t last_update_ts; /* Timestamp of last update (heartbeat) */
  uint64_t last_shadow_sync_ts; /* Timestamp of last shadow sync */
  uint32_t writer_pid;          /* PID of the writer process */
  uint32_t num_consumers;       /* Number of active consumers */
  uint8_t padding[216];         /* Padding to 256 bytes */
};

/* Consumer record - 64 bytes */
struct tt_ring_consumer {
  uint32_t consumer_id;   /* ID consumer */
  uint32_t pid;           /* Process PID */
  uint32_t read_index_l1; /* Read position in L1 */
  uint32_t read_index_l2; /* Read position in L2 */
  uint32_t read_index_l3; /* Read position in L3 */
  uint64_t last_seen_ts;  /* Last activity timestamp */
  uint32_t flags;         /* Flags */
  uint8_t padding[28];    /* Padding to 64 bytes */
};

/* Consumer table */
struct tt_ring_consumer_table {
  struct tt_ring_consumer entries[TT_MAX_CONSUMERS];
};

/* Ring buffer metadata - 64 bytes */
struct tt_ring_meta {
  _Atomic uint32_t seq;  /* Sequence counter for seqlock */
  _Atomic uint32_t head; /* Write position */
  _Atomic uint32_t tail; /* Read position (for single consumer) */
  uint32_t capacity;      /* Capacity in elements */
  uint32_t cell_size;     /* Size of one element */
  uint64_t first_ts;      /* Timestamp of the first element */
  uint64_t last_ts;       /* Timestamp of the last element */
  uint32_t flags;         /* Flags */
  uint8_t padding[20];    /* Padding to 64 bytes */
};

/* Full mmap file layout */
struct tt_ring_layout {
  struct tt_ring_header header;
  struct tt_ring_consumer_table consumers;

  /* L1: 1 hour @ 1s interval */
  struct tt_ring_meta l1_meta;
  uint8_t l1_data[]; /* Dynamic size */

  /* L2 and L3 follow L1_data */
};

/* Offset calculation */
static inline size_t tt_layout_l1_offset(void) {
  return TT_HEADER_SIZE + TT_CONSUMER_TABLE_SIZE + TT_RING_META_SIZE;
}

static inline size_t tt_layout_l2_meta_offset(size_t l1_capacity,
                                              size_t cell_size) {
  return tt_layout_l1_offset() + l1_capacity * cell_size;
}

static inline size_t tt_layout_l2_offset(size_t l1_capacity, size_t cell_size) {
  return tt_layout_l2_meta_offset(l1_capacity, cell_size) + TT_RING_META_SIZE;
}

static inline size_t tt_layout_l3_meta_offset(size_t l1_capacity,
                                              size_t l2_capacity,
                                              size_t cell_size) {
  return tt_layout_l2_offset(l1_capacity, cell_size) + l2_capacity * cell_size;
}

static inline size_t tt_layout_l3_offset(size_t l1_capacity, size_t l2_capacity,
                                         size_t cell_size) {
  return tt_layout_l3_meta_offset(l1_capacity, l2_capacity, cell_size) +
         TT_RING_META_SIZE;
}

static inline size_t tt_layout_total_size(size_t l1_cap, size_t l2_cap,
                                          size_t l3_cap, size_t cell_size) {
  return tt_layout_l3_offset(l1_cap, l2_cap, cell_size) + l3_cap * cell_size;
}

#endif /* TT_RING_LAYOUT_H */
