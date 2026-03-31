/*
 * test_cli_output.c — Unit tests for CLI output helpers.
 *
 * Tests: ttc_fmt_bytes, ttc_fmt_ts, ttc_color, ttc_pct_color.
 * No running daemon required.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <string.h>

#include "cli/src/ctx.h"
#include "cli/src/output.h"

#define PASS "\033[32mPASS\033[0m"
#define FAIL "\033[31mFAIL\033[0m"

static int g_run = 0, g_fail = 0;

#define CHECK(label, cond) do {                              \
    g_run++;                                                 \
    if (cond) { printf("  [" PASS "] %s\n", label); }       \
    else      { printf("  [" FAIL "] %s\n", label); g_fail++; } \
} while (0)

/* ------------------------------------------------------------------ */

static void test_fmt_bytes(void)
{
    char buf[64];

    ttc_fmt_bytes(0, buf, sizeof(buf));
    CHECK("fmt_bytes 0 → '0 B'", strcmp(buf, "0 B") == 0);

    ttc_fmt_bytes(1023, buf, sizeof(buf));
    CHECK("fmt_bytes 1023 → '1023 B'", strcmp(buf, "1023 B") == 0);

    ttc_fmt_bytes(1024, buf, sizeof(buf));
    CHECK("fmt_bytes 1024 → '1.0 KB'", strcmp(buf, "1.0 KB") == 0);

    ttc_fmt_bytes(1024 * 1024, buf, sizeof(buf));
    CHECK("fmt_bytes 1 MB → '1.0 MB'", strcmp(buf, "1.0 MB") == 0);

    ttc_fmt_bytes(1024UL * 1024 * 1024, buf, sizeof(buf));
    CHECK("fmt_bytes 1 GB → '1.0 GB'", strcmp(buf, "1.0 GB") == 0);
}

static void test_fmt_ts(void)
{
    char buf[32];

    /* 0 ms → sentinel "--:--:--" (implementation-defined for zero) */
    ttc_fmt_ts(0, buf, sizeof(buf));
    CHECK("fmt_ts 0 → non-empty string", strlen(buf) > 0);

    /* Non-zero timestamp → HH:MM:SS format (8 chars) */
    ttc_fmt_ts(1000000000000ULL, buf, sizeof(buf));
    CHECK("fmt_ts non-zero → 8-char HH:MM:SS", strlen(buf) == 8);
    CHECK("fmt_ts non-zero → contains colons",
          buf[2] == ':' && buf[5] == ':');

    /* Two different timestamps produce different strings */
    char buf2[32];
    ttc_fmt_ts(1000000001000ULL, buf2, sizeof(buf2));
    /* They differ by 1 second — at least one char should differ */
    CHECK("fmt_ts different timestamps differ", strcmp(buf, buf2) != 0);
}

static void test_color(void)
{
    struct ttc_ctx ctx;
    ttc_ctx_init(&ctx);

    ctx.color = false;
    CHECK("color disabled → empty string",
          strcmp(ttc_color(&ctx, COL_GREEN), "") == 0);

    ctx.color = true;
    CHECK("color enabled → non-empty",
          strlen(ttc_color(&ctx, COL_GREEN)) > 0);
}

static void test_pct_color(void)
{
    struct ttc_ctx ctx;
    ttc_ctx_init(&ctx);
    ctx.color = true;

    /* below warn → green */
    const char *c = ttc_pct_color(&ctx, 30.0, 70.0, 90.0);
    CHECK("pct_color 30% (warn=70) → green",
          strstr(c, "32") != NULL);   /* \033[32m */

    /* between warn and crit → yellow */
    c = ttc_pct_color(&ctx, 80.0, 70.0, 90.0);
    CHECK("pct_color 80% (warn=70,crit=90) → yellow",
          strstr(c, "33") != NULL);   /* \033[33m */

    /* above crit → red */
    c = ttc_pct_color(&ctx, 95.0, 70.0, 90.0);
    CHECK("pct_color 95% (crit=90) → red",
          strstr(c, "31") != NULL);   /* \033[31m */
}

/* ------------------------------------------------------------------ */

int main(void)
{
    printf("=== CLI output unit tests ===\n");
    test_fmt_bytes();
    test_fmt_ts();
    test_color();
    test_pct_color();
    printf("\n  %d/%d passed\n", g_run - g_fail, g_run);
    return g_fail ? 1 : 0;
}
