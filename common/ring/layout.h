#ifndef TT_RING_LAYOUT_H
#define TT_RING_LAYOUT_H

#include <stdatomic.h>
#include <stddef.h>
#include <stdint.h>

/* Magic number для валидации */
#define TT_MAGIC 0x544D5452 /* "TMTR" */
#define TT_VERSION 1

/* Размеры блоков */
#define TT_HEADER_SIZE 256
#define TT_CONSUMER_TABLE_SIZE 2048
#define TT_RING_META_SIZE 64
#define TT_MAX_CONSUMERS 32

/* Главный заголовок файла - 256 bytes */
struct tt_ring_header {
  uint32_t magic;          /* TT_MAGIC */
  uint32_t version;        /* TT_VERSION */
  uint32_t crc32;          /* CRC32 всего файла */
  uint64_t last_update_ts; /* Timestamp последнего обновления (heartbeat) */
  uint64_t last_shadow_sync_ts; /* Timestamp последней синхронизации */
  uint32_t writer_pid;          /* PID writer процесса */
  uint32_t num_consumers;       /* Количество активных consumers */
  uint8_t padding[216];         /* Выравнивание до 256 байт */
};

/* Запись о consumer - 64 bytes */
struct tt_ring_consumer {
  uint32_t consumer_id;   /* ID consumer */
  uint32_t pid;           /* PID процесса */
  uint32_t read_index_l1; /* Позиция чтения в L1 */
  uint32_t read_index_l2; /* Позиция чтения в L2 */
  uint32_t read_index_l3; /* Позиция чтения в L3 */
  uint64_t last_seen_ts;  /* Последняя активность */
  uint32_t flags;         /* Флаги */
  uint8_t padding[28];    /* Выравнивание до 64 байт */
};

/* Таблица consumers */
struct tt_ring_consumer_table {
  struct tt_ring_consumer entries[TT_MAX_CONSUMERS];
};

/* Метаданные кольцевого буфера - 64 bytes */
struct tt_ring_meta {
  _Atomic uint32_t seq;  /* Sequence counter для seqlock */
  _Atomic uint32_t head; /* Позиция записи */
  _Atomic uint32_t tail; /* Позиция чтения (для single consumer) */
  uint32_t capacity;      /* Размер в элементах */
  uint32_t cell_size;     /* Размер одного элемента */
  uint64_t first_ts;      /* Timestamp первого элемента */
  uint64_t last_ts;       /* Timestamp последнего элемента */
  uint32_t flags;         /* Флаги */
  uint8_t padding[20];    /* Выравнивание до 64 байт */
};

/* Полный layout mmap файла */
struct tt_ring_layout {
  struct tt_ring_header header;
  struct tt_ring_consumer_table consumers;

  /* L1: 1 hour @ 1s interval */
  struct tt_ring_meta l1_meta;
  uint8_t l1_data[]; /* Динамический размер */

  /* L2 и L3 идут после L1_data */
};

/* Вычисление смещений */
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
