#!/bin/sh
# run_sanitizers.sh - Build and run tests under ASan + UBSan, then Valgrind.
#
# Usage: sh tests/sanitize/run_sanitizers.sh [asan|ubsan|valgrind|all]
# Default: all
#
# Run from project root.

set -u

MODE="${1:-all}"
PASS="\033[32mPASS\033[0m"
FAIL="\033[31mFAIL\033[0m"
SKIP="\033[33mSKIP\033[0m"

fail=0

check_tool() {
    command -v "$1" >/dev/null 2>&1
}

CFLAGS_BASE="-std=c11 -D_POSIX_C_SOURCE=200809L -D_GNU_SOURCE -I. -pthread"
LIBS="-lrt"
COMMON_SRCS="common/metrics.c common/timer.c common/sysfs.c \
             common/config/ini.c common/config/paths.c common/config/read.c \
             common/log/core.c common/log/stderr.c common/log/syslog.c \
             common/ringbuf/shm.c common/ringbuf/writer.c common/ringbuf/reader.c"

UNIT_TESTS="tests/tinytd/test_ringbuf.c tests/tinytd/test_metrics.c \
            tests/tinytd/test_config.c tests/tinytd/test_shm.c"
INTEG_TESTS="tests/tinytd/test_shm_ipc.c \
             tests/tinytd/test_shadow_sync.c"

ALL_TESTS="$UNIT_TESTS $INTEG_TESTS"

run_suite() {
    label="$1"; cflags="$2"; runner="$3"
    echo "\n=== ${label} ==="

    for src in $ALL_TESTS; do
        name=$(basename "$src" .c)
        bin="/tmp/tt-san-${name}"

        # shellcheck disable=SC2086
        if ! gcc $CFLAGS_BASE $cflags $src $COMMON_SRCS $LIBS -o "$bin" 2>/tmp/tt-san-build.log; then
            printf "  [${FAIL}] build failed: %s\n" "$src"
            cat /tmp/tt-san-build.log
            fail=$((fail + 1))
            continue
        fi

        if $runner "$bin" >/tmp/tt-san-run.log 2>&1; then
            printf "  [${PASS}] %s\n" "$name"
        else
            printf "  [${FAIL}] %s\n" "$name"
            tail -20 /tmp/tt-san-run.log
            fail=$((fail + 1))
        fi
        rm -f "$bin"
    done
}

# --- AddressSanitizer + UBSan ---------------------------------------------
if [ "$MODE" = "asan" ] || [ "$MODE" = "all" ]; then
    if check_tool gcc; then
        run_suite "ASan + UBSan" \
            "-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1" \
            ""
    else
        printf "  [${SKIP}] gcc not found\n"
    fi
fi

# --- Valgrind memcheck ----------------------------------------------------
if [ "$MODE" = "valgrind" ] || [ "$MODE" = "all" ]; then
    if check_tool valgrind; then
        run_suite "Valgrind memcheck" \
            "-g -O2" \
            "valgrind --error-exitcode=1 --leak-check=full --quiet"
    else
        printf "  [${SKIP}] valgrind not found\n"
    fi
fi

echo ""
if [ "$fail" -eq 0 ]; then
    printf "[${PASS}] All sanitizer checks passed\n"
else
    printf "[${FAIL}] %d check(s) failed\n" "$fail"
fi

[ "$fail" -eq 0 ]
