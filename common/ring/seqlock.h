#ifndef TT_RING_SEQLOCK_H
#define TT_RING_SEQLOCK_H

#include <stdatomic.h>
#include <stdint.h>

/* Writer: начать запись */
static inline void tt_seqlock_write_begin(_Atomic uint32_t *seq) {
  uint32_t s = atomic_load_explicit(seq, memory_order_relaxed);
  atomic_store_explicit(seq, s + 1, memory_order_release);
}

/* Writer: завершить запись */
static inline void tt_seqlock_write_end(_Atomic uint32_t *seq) {
  uint32_t s = atomic_load_explicit(seq, memory_order_relaxed);
  atomic_store_explicit(seq, s + 1, memory_order_release);
}

/* Reader: начать чтение */
static inline uint32_t tt_seqlock_read_begin(_Atomic uint32_t *seq) {
  uint32_t s;
  do {
    s = atomic_load_explicit(seq, memory_order_acquire);
  } while (s & 1); /* Ждем четное значение */
  return s;
}

/* Reader: проверить консистентность */
static inline int tt_seqlock_read_retry(_Atomic uint32_t *seq, uint32_t start) {
  atomic_thread_fence(memory_order_acquire);
  return atomic_load_explicit(seq, memory_order_acquire) != start;
}

#endif
