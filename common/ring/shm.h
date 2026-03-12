#ifndef TT_RING_SHM_H
#define TT_RING_SHM_H

#include <stddef.h>

enum {
  SHM_OK = 0,
  SHM_MMAP_ERR = -1,
  SHM_FTRUNCATE_ERR = -2,
  SHM_OPENFD_ERR = -3,
  SHM_READFD_ERR = -4,
  SHM_STATFD_ERR = -5,
  SHM_FAIL = -6,
};

void* tt_shm_create(const char* path, size_t len, int mode);
void* tt_shm_read(const char* path, size_t* len);
void tt_shm_dealloc(void* addr, size_t len);
void tt_shm_unlink(const char* path);

const char* tt_shm_err(int errcode);

#endif /* RING_SHM_H */