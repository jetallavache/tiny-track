#ifndef TT_CONFIG_PATHS_H
#define TT_CONFIG_PATHS_H

/* Получить путь к live mmap файлу
 * Приоритет: env -> config -> default */
const char* tt_config_live_path(void);

/* Получить путь к shadow mmap файлу */
const char* tt_config_shadow_path(void);

/* Получить путь к конфигу */
const char* tt_config_file_path(void);

#endif /* TT_CONFIG_PATHS_H */
