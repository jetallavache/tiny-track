#ifndef TTG_IOBUF_H
#define TTG_IOBUF_H

#include <stddef.h>
#include <stdint.h>

#define TTG_IO_SIZE 16384

struct ttg_iobuf {
  unsigned char* buf; /* Pointer to stored data */
  size_t size;        /* Available size */
  size_t len;         /* Current byte count */
  size_t align;       /* Alignment during allocation */
};

int ttg_iobuf_init(struct ttg_iobuf*, size_t, size_t);
int ttg_iobuf_resize(struct ttg_iobuf*, size_t);
void ttg_iobuf_free(struct ttg_iobuf*);
size_t ttg_iobuf_add(struct ttg_iobuf*, size_t, const void*, size_t);
size_t ttg_iobuf_del(struct ttg_iobuf*, size_t ofs, size_t len);

#endif /* TTG_IOBUF_H */