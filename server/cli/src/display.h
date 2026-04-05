#ifndef TINY_CLI_DISPLAY_H
#define TINY_CLI_DISPLAY_H

#include "common/metrics.h"

void ttc_display_metrics(struct tt_metrics* m);
void ttc_display_metrics_json(struct tt_metrics* m);
void ttc_display_metrics_compact(struct tt_metrics* m);

#endif
