
#include "ring.h"
#include <string.h>

int ringbuf_init(void *buf, size_t capacity, size_t cellsize, struct ringbuf_t *rb) {
    rb->capacity = capacity;
    rb->cellsize = cellsize;
    rb->buf = buf;
    ringbuf_clear(rb);

    return rb->buf ? RINGBUF_OK : RINGBUF_PARAM_ERR;
}

int ringbuf_clear(struct ringbuf_t *rb) {
    if (rb->buf == NULL) return RINGBUF_PARAM_ERR;

    rb->head = rb->tail = 0;

    return RINGBUF_OK;
}

int ringbuf_available(uint16_t *len, struct ringbuf_t *rb) {
    if (rb->buf == NULL) return RINGBUF_PARAM_ERR;

    if (rb->head < rb->tail)
        *len = rb->capacity - rb->tail + rb->head;
    else
        *len = rb->head - rb->tail;

    return RINGBUF_OK;
}

int ringbuf_push(const void *data, struct ringbuf_t *rb) {
    if (rb->buf == NULL || rb->capacity <= 0) return RINGBUF_PARAM_ERR;

    const char *input = data;
    memcpy(&rb->buf[rb->head * rb->cellsize], &input[0], rb->cellsize);

    rb->head = (rb->head + 1) % rb->capacity;

    return RINGBUF_OK;
}