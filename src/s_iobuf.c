#include "s_iobuf.h"

#include <stdlib.h>
#include <string.h>

#include "log.h"

static size_t roundup(size_t size, size_t align) {
  return align == 0 ? size : (size + align - 1) / align * align;
}

void bufzero(volatile unsigned char *buf, size_t len) {
  if (buf != NULL) {
    while (len--) *buf++ = 0;
  }
}

int s_iobuf_resize(struct s_iobuf *io, size_t new_size) {
  int ok = 1;
  new_size = roundup(new_size, io->align);
  if (new_size == 0) {
    bufzero(io->buf, io->size);
    free(io->buf);
    io->buf = NULL;
    io->len = io->size = 0;
  } else if (new_size != io->size) {
    // NOTE(lsm): do not use realloc here. Use s_calloc/s_free only
    void *p = calloc(1, new_size);
    if (p != NULL) {
      size_t len = new_size < io->len ? new_size : io->len;
      if (len > 0 && io->buf != NULL) memmove(p, io->buf, len);
      bufzero(io->buf, io->size);
      free(io->buf);
      io->buf = (unsigned char *)p;
      io->size = new_size;
    } else {
      ok = 0;
      L_ERROR(("%lld->%lld", (uint64_t)io->size, (uint64_t)new_size));
    }
  }
  return ok;
}

int s_iobuf_init(struct s_iobuf *io, size_t size, size_t align) {
  io->buf = NULL;
  io->align = align;
  io->size = io->len = 0;
  return s_iobuf_resize(io, size);
}

size_t s_iobuf_add(struct s_iobuf *io, size_t ofs, const void *buf,
                   size_t len) {
  size_t new_size = roundup(io->len + len, io->align);
  s_iobuf_resize(io, new_size);       // Attempt to resize
  if (new_size != io->size) len = 0;  // Resize failure, append nothing
  if (ofs < io->len) memmove(io->buf + ofs + len, io->buf + ofs, io->len - ofs);
  if (buf != NULL) memmove(io->buf + ofs, buf, len);
  if (ofs > io->len) io->len += ofs - io->len;
  io->len += len;
  return len;
}

size_t s_iobuf_del(struct s_iobuf *io, size_t ofs, size_t len) {
  if (ofs > io->len) ofs = io->len;
  if (ofs + len > io->len) len = io->len - ofs;
  if (io->buf) memmove(io->buf + ofs, io->buf + ofs + len, io->len - ofs - len);
  if (io->buf) bufzero(io->buf + io->len - len, len);
  io->len -= len;
  return len;
}

void s_iobuf_free(struct s_iobuf *io) { s_iobuf_resize(io, 0); }
