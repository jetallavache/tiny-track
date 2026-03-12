#ifndef TINY_CLI_DISPLAY_H
#define TINY_CLI_DISPLAY_H

#include "common/proto/v1.h"

void ttc_display_metrics(struct tt_proto_metrics* m);
void ttc_display_metrics_json(struct tt_proto_metrics* m);
void ttc_display_metrics_compact(struct tt_proto_metrics* m);

#endif
