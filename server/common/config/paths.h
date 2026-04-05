#ifndef TT_CONFIG_PATHS_H
#define TT_CONFIG_PATHS_H

/* Get path to the live mmap file
 * Priority: env -> config -> default */
const char* tt_config_live_path(void);

/* Get path to the shadow mmap file */
const char* tt_config_shadow_path(void);

/* Get path to the config file */
const char* tt_config_file_path(void);

const char* tt_config_pid_path(void);

#endif /* TT_CONFIG_PATHS_H */
