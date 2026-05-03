#ifndef TTR_SEQLOCK_H
#define TTR_SEQLOCK_H

#include <stdatomic.h>
#include <stdint.h>

/* Writer: begin write */
static inline void ttr_seqlock_write_begin(_Atomic uint32_t* seq) {
  uint32_t s = atomic_load_explicit(seq, memory_order_relaxed);
  atomic_store_explicit(seq, s + 1, memory_order_release);
}

/* Writer: end write — seq_cst ensures all data writes are visible before
 * the even sequence number is published to readers. */
static inline void ttr_seqlock_write_end(_Atomic uint32_t* seq) {
  uint32_t s = atomic_load_explicit(seq, memory_order_relaxed);
  atomic_store_explicit(seq, s + 1, memory_order_seq_cst);
}

/* Reader: begin read */
static inline uint32_t ttr_seqlock_read_begin(_Atomic uint32_t* seq) {
  uint32_t s;
  do {
    s = atomic_load_explicit(seq, memory_order_acquire);
  } while (s & 1); /* Wait for even value */
  return s;
}

/* Reader: check consistency */
static inline int ttr_seqlock_read_retry(_Atomic uint32_t* seq,
                                         uint32_t start) {
  atomic_thread_fence(memory_order_acquire);
  return atomic_load_explicit(seq, memory_order_acquire) != start;
}

#endif /* TTR_SEQLOCK_H */
