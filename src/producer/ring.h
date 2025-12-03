#ifndef SRC_PRODUCER_RING_H
#define SRC_PRODUCER_RING_H

#include <stdint.h>
#include <stddef.h>

enum {
    RINGBUF_OK = 0,
    RINGBUF_ERR = -1,
    RINGBUF_PARAM_ERR = -2,
    RINGBUF_OVERFLOW = -3,
};

struct ringbuf_t {
    uint8_t *buf;
    volatile size_t head; /* Place of write point [cells] */
    volatile size_t tail; /* Place of read point [cells] */
    volatile size_t capacity;
    volatile size_t cellsize;
};

int ringbuf_init(void *buf, size_t capacity, size_t cellsize, struct ringbuf_t *rb);
int ringbuf_clear(struct ringbuf_t *rb);
int ringbuf_available(uint16_t *len, struct ringbuf_t *rb);

int ringbuf_push(const void *data, struct ringbuf_t *rb);
// int ringbuf_push_to_levels(const void *data, struct ringbuf_t *rb);
int ringbuf_read(const void *data, struct ringbuf_t *rb);
int ringbuf_watch(const void *data, struct ringbuf_t *rb);

#endif /* SRC_PRODUCER_RING_H */