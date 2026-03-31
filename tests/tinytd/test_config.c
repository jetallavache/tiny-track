/*
 * test_config.c - Unit tests for INI config parser and config reader.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "common/config/ini.h"
#include "common/config/read.h"

#define PASS "\033[32mPASS\033[0m"
#define FAIL "\033[31mFAIL\033[0m"

static int g_run = 0, g_fail = 0;

#define CHECK(label, cond) do {                         \
    g_run++;                                            \
    if (cond) { printf("  [" PASS "] %s\n", label); }  \
    else      { printf("  [" FAIL "] %s\n", label); g_fail++; } \
} while (0)

/* Write a temp INI file, return path (caller must unlink) */
static const char* write_tmp_ini(void) {
    static char path[] = "/tmp/tt-test-XXXXXX.conf";
    /* mkstemps needs suffix len */
    int fd = mkstemps(path, 5);
    if (fd < 0) return NULL;

    const char *content =
        "[section]\n"
        "str_key = hello world\n"
        "int_key = 42\n"
        "bool_true = true\n"
        "bool_false = false\n"
        "  spaced  =  trimmed  \n";

    write(fd, content, strlen(content));
    close(fd);
    return path;
}

static void test_ini_read(void) {
    printf("\n[ini_read]\n");
    const char *path = write_tmp_ini();
    if (!path) { printf("  [SKIP] mkstemps failed\n"); return; }

    char buf[64];
    CHECK("read str_key",
          tt_config_ini_read(path, "section.str_key", buf, sizeof(buf)) == 0
          && strcmp(buf, "hello world") == 0);

    CHECK("read int_key as string",
          tt_config_ini_read(path, "section.int_key", buf, sizeof(buf)) == 0
          && strcmp(buf, "42") == 0);

    CHECK("missing key returns -1",
          tt_config_ini_read(path, "section.no_such", buf, sizeof(buf)) != 0);

    CHECK("missing file returns -1",
          tt_config_ini_read("/tmp/no-such-file.conf", "x.y", buf, sizeof(buf)) != 0);

    unlink(path);
}

static void test_config_read(void) {
    printf("\n[config_read helpers]\n");
    const char *path = write_tmp_ini();
    if (!path) { printf("  [SKIP] mkstemps failed\n"); return; }

    CHECK("read_int int_key = 42",
          tt_config_read_int(path, "section.int_key", 0) == 42);

    CHECK("read_int missing → default",
          tt_config_read_int(path, "section.missing", 99) == 99);

    CHECK("read_bool true",
          tt_config_read_bool(path, "section.bool_true", false) == true);

    CHECK("read_bool false",
          tt_config_read_bool(path, "section.bool_false", true) == false);

    char buf[64];
    CHECK("read_str str_key",
          tt_config_read_str(path, "section.str_key", buf, sizeof(buf), "") == 0
          && strcmp(buf, "hello world") == 0);

    CHECK("read_str missing → default",
          tt_config_read_str(path, "section.missing", buf, sizeof(buf), "def") == 0
          && strcmp(buf, "def") == 0);

    unlink(path);
}

int main(void) {
    printf("=== test_config ===\n");
    test_ini_read();
    test_config_read();

    printf("\n--- %d/%d passed ---\n", g_run - g_fail, g_run);
    return g_fail ? 1 : 0;
}
