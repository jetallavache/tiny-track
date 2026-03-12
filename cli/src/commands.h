#ifndef TINY_CLI_COMMANDS_H
#define TINY_CLI_COMMANDS_H

int ttc_cmd_status(const char* path);
int ttc_cmd_live(const char* path, int interval_ms, const char* format);
int ttc_cmd_history(const char* path, const char* range, int level);
int ttc_cmd_version(void);

#endif
