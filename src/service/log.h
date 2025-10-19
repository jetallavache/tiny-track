#ifndef SRC_LOG_H
#define SRC_LOG_H

#include <stdarg.h>
#include <stddef.h>
#include <stdint.h>

#define ENABLE_LOG 1

enum { LL_NONE, LL_ERROR, LL_INFO, LL_DEBUG, LL_VERBOSE };

extern int log_level; /* Current logger level, one of LL_* */

void out(const char* fmt, ...);

void out_prefix(int ll, const char* file, int line, const char* fname);

void out_hexdump(const void* buf, size_t len);

void logger(const char* fmt, ...);

// void log_set_fn(s_pfn_t fn, void *param);

#define log_set(level_) log_level = (level_)

#if ENABLE_LOG
#define LOG(level, args)                                 \
  do {                                                   \
    if ((level) <= log_level) {                          \
      out_prefix((level), __FILE__, __LINE__, __func__); \
      out args;                                          \
    }                                                    \
  } while (0)
#else
#define LOG(level, args) \
  do {                   \
    if (0) out args;     \
  } while (0)
#endif

#define L_ERROR(args) LOG(LL_ERROR, args)
#define L_INFO(args) LOG(LL_INFO, args)
#define L_DEBUG(args) LOG(LL_DEBUG, args)
#define L_VERBOSE(args) LOG(LL_VERBOSE, args)

#endif  // SRC_LOG_H