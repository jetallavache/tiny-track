#include "shm.h"

#include <errno.h>
#include <fcntl.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>

#include "common/log/log.h"

static void* mmap_fd(int fd, size_t len, int prot) {
  void* addr = mmap(NULL, len, prot, MAP_SHARED, fd, 0);
  close(fd);
  if (addr == MAP_FAILED) {
    tt_log_err("mmap: %s", strerror(errno));
    return (void*)TTR_SHM_MMAP_ERR;
  }
  return addr;
}

void* ttr_shm_create(const char* path, size_t len, int mode) {
  int fd = open(path, O_CREAT | O_RDWR, mode);
  if (fd < 0) {
    tt_log_err("open failed: path='%s' errno=%d (%s)", path, errno, strerror(errno));
    return (void*)TTR_SHM_OPENFD_ERR;
  }
  fchmod(fd, mode); /* enforce exact mode, bypass umask */
  if (ftruncate(fd, len) < 0) {
    tt_log_err("ftruncate: %s", strerror(errno));
    close(fd);
    return (void*)TTR_SHM_FTRUNCATE_ERR;
  }
  return mmap_fd(fd, len, PROT_READ | PROT_WRITE);
}

void* ttr_shm_read(const char* path, size_t* len) {
  int fd = open(path, O_RDONLY);
  if (fd < 0) {
    tt_log_err("open failed: path='%s' errno=%d (%s)", path, errno, strerror(errno));
    return (void*)TTR_SHM_OPENFD_ERR;
  }
  struct stat st;
  if (fstat(fd, &st) < 0 || st.st_size == 0) {
    tt_log_err("fstat failed or empty: %s", strerror(errno));
    close(fd);
    return (void*)TTR_SHM_STATFD_ERR;
  }
  *len = (size_t)st.st_size;
  return mmap_fd(fd, *len, PROT_READ);
}

void ttr_shm_dealloc(void* addr, size_t len) {
  if (munmap(addr, len) < 0) tt_log_err("munmap: %s", strerror(errno));
}

void ttr_shm_unlink(const char* path) { shm_unlink(path); }

const char* tt_shm_strerror(int errcode) {
  switch (errcode) {
    case TTR_SHM_MMAP_ERR:
      return "mmap error";
    case TTR_SHM_FTRUNCATE_ERR:
      return "ftruncate error";
    case TTR_SHM_OPENFD_ERR:
      return "open error";
    case TTR_SHM_READFD_ERR:
      return "read error";
    case TTR_SHM_STATFD_ERR:
      return "fstat error";
    case TTR_SHM_FAIL:
      return "empty buffer";
    default:
      return "unknown error";
  }
}
