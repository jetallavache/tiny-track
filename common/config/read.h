#ifndef TT_CONFIG_READER_H
#define TT_CONFIG_READER_H

#include <stdbool.h>
#include <stddef.h>

#include "common/log.h"

/* Read an integer from config */
int tt_config_read_int(const char* filepath, const char* key, int default_val);

/* Read a boolean value from config */
bool tt_config_read_bool(const char* filepath, const char* key,
                         bool default_val);

/* Read a string into a buffer */
int tt_config_read_str(const char* filepath, const char* key, char* buf,
                       size_t bufsize, const char* default_val);

/* Convert log level string to enum tt_log_level */
enum tt_log_level tt_config_parse_log_level(const char* level_str);

#endif /* TT_CONFIG_READER_H */
