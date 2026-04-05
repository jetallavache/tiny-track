#ifndef TT_CONFIG_INI_H
#define TT_CONFIG_INI_H

#include <stddef.h>

/* Read a value from INI into a buffer
 * Returns 0 on success, -1 on error */
int tt_config_ini_read(const char* filepath, const char* key, char* buf, size_t bufsize);

#endif /* TT_CONFIG_INI_H */
