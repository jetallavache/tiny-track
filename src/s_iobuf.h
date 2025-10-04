#ifndef SRC_S_IOBUF_H
#define SRC_S_IOBUF_H

#include <stddef.h>
#include <stdint.h>

#define S_IO_SIZE 16384

struct s_iobuf {
  unsigned char *buf; /* Указатель на сохраненные данные */
  size_t size;        /* Доступный размер */
  size_t len;         /* Текущее количество байт */
  size_t align;       /* Выравнивание во время распределения */
};

int s_iobuf_init(struct s_iobuf *, size_t, size_t);
int s_iobuf_resize(struct s_iobuf *, size_t);
void s_iobuf_free(struct s_iobuf *);
size_t s_iobuf_add(struct s_iobuf *, size_t, const void *, size_t);
size_t s_iobuf_del(struct s_iobuf *, size_t ofs, size_t len);

#endif  // SRC_S_IOBUF_H