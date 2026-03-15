#ifndef TTC_COMMANDS_H
#define TTC_COMMANDS_H

#include "ctx.h"

int ttc_cmd_status(const struct ttc_ctx* ctx);
int ttc_cmd_metrics(const struct ttc_ctx* ctx);
int ttc_cmd_history(const struct ttc_ctx* ctx, int level, int count);
int ttc_cmd_signal(const struct ttc_ctx* ctx, const char* signame);
int ttc_cmd_service(const struct ttc_ctx* ctx, const char* action);
int ttc_cmd_debug(const struct ttc_ctx* ctx);
int ttc_cmd_version(const struct ttc_ctx* ctx);

#endif /* TTC_COMMANDS_H */
