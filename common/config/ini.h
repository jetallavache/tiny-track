#ifndef TT_CONFIG_INI_H
#define TT_CONFIG_INI_H

#include <stddef.h>

/* Прочитать значение из INI в буфер
 * Возвращает 0 при успехе, -1 при ошибке */
int tt_config_ini_read(const char* filepath, const char* key, char* buf,
                       size_t bufsize);

#endif /* TT_CONFIG_INI_H */
