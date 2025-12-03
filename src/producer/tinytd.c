#include "ring.h"

#include "../protocol/format.h"

#include <string.h>
#include <stdio.h>
#include <stdlib.h>

#define L1_SAMPLES 5 // 3600
#define L2_SAMPLES 1440
#define L3_SAMPLES 4320

void out(struct ringbuf_t l1) {
    for (int i = 0; i < L1_SAMPLES; i++) {
        struct p_metrics_payload m;
        memcpy(&m, &l1.buf[i * l1.cellsize], l1.cellsize);
        printf("snd %4.1f%% %4.1f%% %6.4lf/%6.4lf %4.1f %4.1f %4.1f "
            "%3d/%4d %6.2f%%/%4.1f/%4.1f \n",
            (float)m.cpu_usage / 100, (float)m.mem_usage / 100,
            (double)m.net_rx / 8000, (double)m.net_tx / 8000,
            (float)m.load_1min / 100, (float)m.load_5min / 100,
            (float)m.load_15min / 100, (int)m.nr_running, (int)m.nr_total,
            (float)m.du_usage / 100, (float)m.du_total_bytes,
            (float)m.du_free_bytes);
    }
}

struct p_metrics_payload gen() {

    struct p_metrics_payload fill = {
        .cpu_usage = (rand() % 100 + 1),
        .mem_usage = (rand() % 100 + 1),
        .net_rx = (rand() % 100 + 1),
        .net_tx = (rand() % 100 + 1),
        .load_1min = (rand() % 100 + 1),
        .load_5min = (rand() % 100 + 1),
        .load_15min = (rand() % 100 + 1),
        .nr_running = (rand() % 100 + 1),
        .nr_total = (rand() % 100 + 1),
        .du_usage = (rand() % 100 + 1),
        .du_total_bytes = (rand() % 100 + 1),
        .du_free_bytes = (rand() % 100 + 1),
    };

    return fill;
}

void test() {
    struct ringbuf_t l1;
    struct p_metrics_payload l1_data[L1_SAMPLES] = {0,};
    ringbuf_init(l1_data, L1_SAMPLES, sizeof(struct p_metrics_payload), &l1);

    struct p_metrics_payload fill = {0};

    fill = gen();
    ringbuf_push(&fill, &l1);
    fill = gen();
    ringbuf_push(&fill, &l1);
    fill = gen();
    ringbuf_push(&fill, &l1);
    fill = gen();
    ringbuf_push(&fill, &l1);
    fill = gen();
    ringbuf_push(&fill, &l1);
    out(l1);

    printf("\n\n");

    fill = gen();
    ringbuf_push(&fill, &l1);
    fill = gen();
    ringbuf_push(&fill, &l1);
    out(l1);
}

int main(void) {

    test();

    return 0;
}