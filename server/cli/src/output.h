#ifndef TTC_OUTPUT_H
#define TTC_OUTPUT_H

#include <stddef.h>

#include "common/metrics.h"
#include "common/ringbuf/layout.h"
#include "ctx.h"

/* ANSI color codes (empty strings when color=false) */
#define COL_RESET "\033[0m"
#define COL_GREEN "\033[32m"
#define COL_YELLOW "\033[33m"
#define COL_RED "\033[31m"
#define COL_BOLD "\033[1m"
#define COL_CYAN "\033[36m"
#define COL_DIM "\033[2m"

/* Color-aware helpers */
const char* ttc_color(const struct ttc_ctx* ctx, const char* code);

/* Threshold-based color for a percentage value */
const char* ttc_pct_color(const struct ttc_ctx* ctx, double pct, double warn,
                          double crit);

/* Print a metrics sample in the requested format */
void ttc_print_metrics(const struct ttc_ctx* ctx, const struct tt_metrics* m);

/* Print ring buffer level info */
void ttc_print_ring_level(const struct ttc_ctx* ctx, int level,
                          const struct ttr_meta* meta, const char* label);

/* Print a key=value row in table mode, or emit JSON field */
void ttc_print_field(const struct ttc_ctx* ctx, const char* key,
                     const char* value, bool last);

/* Horizontal separator */
void ttc_print_sep(const struct ttc_ctx* ctx, int width);

/* Format bytes into human-readable string (e.g. 1.2 GB) */
void ttc_fmt_bytes(unsigned long bytes, char* buf, size_t len);

/* Format ms timestamp into HH:MM:SS */
void ttc_fmt_ts(uint64_t ts_ms, char* buf, size_t len);

#endif /* TTC_OUTPUT_H */
