#include "shm.h"

#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>

#include "common/log.h"

void* ttr_shm_create(const char* path, size_t len, int mode) {
  int fd;
  void* addr;

  tt_log_debug("ttr_shm_create: path='%s' (strlen=%zu), len=%zu, mode=0%o",
               path, strlen(path), len, mode);

  /* Check if directory exists */
  char dir_path[256];
  strncpy(dir_path, path, sizeof(dir_path) - 1);
  dir_path[sizeof(dir_path) - 1] = '\0';
  char* last_slash = strrchr(dir_path, '/');
  if (last_slash) {
    *last_slash = '\0';
    struct stat st;
    if (stat(dir_path, &st) != 0) {
      tt_log_err("Directory does not exist: '%s' (errno=%d: %s)", dir_path,
                 errno, strerror(errno));
    } else {
      tt_log_debug("Directory exists: '%s' (mode=0%o)", dir_path, st.st_mode);
    }
  }

  if ((fd = open(path, O_CREAT | O_RDWR, mode)) < (0)) {
    tt_log_err("open_fd failed: path='%s', mode=0%o, errno=%d (%s)", path, mode,
               errno, strerror(errno));
    return (void*)TTR_SHM_OPENFD_ERR;
  }

  tt_log_debug("open succeeded: fd=%d", fd);

  if ((ftruncate(fd, len)) < (0)) {
    tt_log_err("ftruncate: %s", strerror(errno));
    close(fd);
    return (void*)TTR_SHM_FTRUNCATE_ERR;
  }
  if ((addr = mmap(NULL, len, PROT_WRITE | PROT_READ, MAP_SHARED, fd, 0)) ==
      MAP_FAILED) {
    tt_log_err("mmap: %s", strerror(errno));
    close(fd);
    return (void*)TTR_SHM_MMAP_ERR;
  }
  if (!addr)
    return (void*)TTR_SHM_FAIL;
  if (fd != (-1))
    close(fd);
  return addr;
}

void* ttr_shm_read(const char* path, size_t* len) {
  int fd;
  void* addr;
  struct stat st;

  if ((fd = open(path, O_RDONLY)) < 0) {
    tt_log_err("open_fd failed: path=%s, errno=%d (%s)", path, errno,
               strerror(errno));
    return (void*)TTR_SHM_OPENFD_ERR;
  }

  if ((fstat(fd, &st)) < 0) {
    tt_log_err("fstat: %s", strerror(errno));
    close(fd);
    return (void*)TTR_SHM_STATFD_ERR;
  }

  if (st.st_size == 0) {
    tt_log_err("fstat equal 0");
    close(fd);
    return (void*)TTR_SHM_STATFD_ERR;
  }

  *len = st.st_size;

  if ((addr = mmap(NULL, *len, PROT_READ, MAP_SHARED, fd, 0)) == MAP_FAILED) {
    tt_log_err("mmap: %s", strerror(errno));
    close(fd);
    return (void*)TTR_SHM_MMAP_ERR;
  }

  if (!addr)
    return (void*)TTR_SHM_FAIL;
  if (fd != (-1))
    close(fd);
  return addr;
}

void ttr_shm_dealloc(void* addr, size_t len) {
  if ((munmap(addr, len)) < (0)) {
    tt_log_err("munmap: %s", strerror(errno));
  }
}

void ttr_shm_unlink(const char* path) {
  shm_unlink(path);
}

const char* tt_shm_errorstr(int errcode) {
  switch (errcode) {
    case TTR_SHM_MMAP_ERR:
      return "Error mmap";
      break;
    case TTR_SHM_FTRUNCATE_ERR:
      return "Error ftruncate";
      break;
    case TTR_SHM_OPENFD_ERR:
      return "Error open_fd";
      break;
    case TTR_SHM_READFD_ERR:
      return "Error read_fd";
      break;
    case TTR_SHM_STATFD_ERR:
      return "Error fstat";
      break;
    case TTR_SHM_FAIL:
      return "Buffer is empty";
      break;
    default:
      return "Error undefined";
      break;
  }
}
