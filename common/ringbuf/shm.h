#ifndef TTR_SHM_H
#define TTR_SHM_H

#include <stddef.h>

enum {
  TTR_SHM_OK = 0,
  TTR_SHM_MMAP_ERR = -1,
  TTR_SHM_FTRUNCATE_ERR = -2,
  TTR_SHM_OPENFD_ERR = -3,
  TTR_SHM_READFD_ERR = -4,
  TTR_SHM_STATFD_ERR = -5,
  TTR_SHM_FAIL = -6,
};

void* ttr_shm_create(const char* path, size_t len, int mode);
void* ttr_shm_read(const char* path, size_t* len);
void ttr_shm_dealloc(void* addr, size_t len);
void ttr_shm_unlink(const char* path);

const char* tt_shm_errorstr(int errcode);

#endif /* TTR_SHM_H */