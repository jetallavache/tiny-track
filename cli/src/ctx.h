#ifndef TTC_CTX_H
#define TTC_CTX_H

#include <stdbool.h>

/* Output format */
typedef enum {
  FMT_TABLE,
  FMT_JSON,
  FMT_COMPACT,
} ttc_fmt;

/* Global CLI context passed to every command */
struct ttc_ctx {
  const char* mmap_path;   /* Path to live mmap file          */
  const char* config_path; /* Path to tinytrack.conf          */
  const char* pid_file;    /* Path to tinytd.pid              */
  ttc_fmt format;          /* Output format                   */
  bool verbose;            /* Verbose logging                 */
  bool color;              /* ANSI color output               */
  int interval_ms;         /* Refresh interval for live views */
};

void ttc_ctx_init(struct ttc_ctx* ctx);

#endif /* TTC_CTX_H */
