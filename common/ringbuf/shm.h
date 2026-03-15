#ifndef TT_RING_SHM_H
#define TT_RING_SHM_H

#include <stddef.h>

enum {
  TT_SHM_OK = 0,
  TT_SHM_MMAP_ERR = -1,
  TT_SHM_FTRUNCATE_ERR = -2,
  TT_SHM_OPENFD_ERR = -3,
  TT_SHM_READFD_ERR = -4,
  TT_SHM_STATFD_ERR = -5,
  TT_SHM_FAIL = -6,
};

void* tt_shm_create(const char* path, size_t len, int mode);
void* tt_shm_read(const char* path, size_t* len);
void tt_shm_dealloc(void* addr, size_t len);
void tt_shm_unlink(const char* path);

const char* tt_shm_error_code_str(int errcode);

#endif /* RING_SHM_H */