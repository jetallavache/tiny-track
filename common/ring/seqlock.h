#ifndef TT_RING_SEQLOCK_H
#define TT_RING_SEQLOCK_H

#include <stdatomic.h>
#include <stdint.h>

/* Writer: начать запись */
static inline void tt_seqlock_write_begin(volatile uint32_t *seq) {
  uint32_t s = __atomic_load_n(seq, __ATOMIC_RELAXED);
  __atomic_store_n(seq, s + 1, __ATOMIC_RELEASE);
}

/* Writer: завершить запись */
static inline void tt_seqlock_write_end(volatile uint32_t *seq) {
  uint32_t s = __atomic_load_n(seq, __ATOMIC_RELAXED);
  __atomic_store_n(seq, s + 1, __ATOMIC_RELEASE);
}

/* Reader: начать чтение */
static inline uint32_t tt_seqlock_read_begin(volatile uint32_t *seq) {
  uint32_t s;
  do {
    s = __atomic_load_n(seq, __ATOMIC_ACQUIRE);
  } while (s & 1); /* Ждем четное значение */
  return s;
}

/* Reader: проверить консистентность */
static inline int tt_seqlock_read_retry(volatile uint32_t *seq, uint32_t start) {
  __atomic_thread_fence(__ATOMIC_ACQUIRE);
  return __atomic_load_n(seq, __ATOMIC_ACQUIRE) != start;
}

#endif
