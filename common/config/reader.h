#ifndef TT_CONFIG_READER_H
#define TT_CONFIG_READER_H

#include <stdbool.h>
#include <stddef.h>

#include "../sink/log.h"

/* Прочитать целое число из конфига */
int tt_config_read_int(const char* filepath, const char* key, int default_val);

/* Прочитать булево значение из конфига */
bool tt_config_read_bool(const char* filepath, const char* key,
                         bool default_val);

/* Прочитать строку в буфер */
int tt_config_read_str(const char* filepath, const char* key, char* buf,
                       size_t bufsize, const char* default_val);

/* Преобразовать строку уровня лога в tt_log_level_t */
tt_log_level_t tt_config_parse_log_level(const char* level_str);

#endif /* TT_CONFIG_READER_H */
