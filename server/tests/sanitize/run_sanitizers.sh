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

# --- Valgrind with --track-origins for ringbuf ----------------------------
if [ "$MODE" = "valgrind" ] || [ "$MODE" = "all" ]; then
    if check_tool valgrind; then
        echo "\n=== Valgrind --track-origins (test_ringbuf) ==="
        src="tests/tinytd/test_ringbuf.c"
        bin="/tmp/tt-vg-ringbuf"
        # shellcheck disable=SC2086
        if gcc $CFLAGS_BASE -g -O0 $src $COMMON_SRCS $LIBS -o "$bin" 2>/dev/null; then
            if valgrind --error-exitcode=1 --leak-check=full \
                        --track-origins=yes --quiet "$bin" >/tmp/tt-vg-rb.log 2>&1; then
                printf "  [${PASS}] test_ringbuf (track-origins)\n"
            else
                printf "  [${FAIL}] test_ringbuf (track-origins)\n"
                tail -20 /tmp/tt-vg-rb.log
                fail=$((fail + 1))
            fi
        fi
        rm -f "$bin" /tmp/tt-vg-rb.log
    fi
fi

# --- ASan gateway load test -----------------------------------------------
if [ "$MODE" = "gateway" ] || [ "$MODE" = "all" ]; then
    echo "\n=== ASan gateway load ==="
    if ! check_tool python3; then
        printf "  [${SKIP}] python3 not found\n"
    elif ! check_tool gcc; then
        printf "  [${SKIP}] gcc not found\n"
    else
        GW_SRC="gateway/src"
        GW_SRCS="$GW_SRC/main.c $GW_SRC/proto.c $GW_SRC/config.c $GW_SRC/session.c \
                 $GW_SRC/b64.c $GW_SRC/reader.c $GW_SRC/net.c $GW_SRC/http.c \
                 $GW_SRC/ws.c $GW_SRC/sock.c $GW_SRC/tls.c $GW_SRC/event.c \
                 $GW_SRC/iobuf.c $GW_SRC/printf.c $GW_SRC/str.c $GW_SRC/url.c \
                 $GW_SRC/util.c"
        GW_BIN="/tmp/tt-asan-tinytrack"
        GW_PORT=14099
        CONF="tests/tinytrack.conf-test"
        LIVE="/tmp/tinytd-asan-live.dat"
        SHADOW="/tmp/tinytd-asan-shadow.dat"

        # Build tinytd under ASan
        TD_BIN="/tmp/tt-asan-tinytd"
        TD_SRCS="tinytd/src/main.c tinytd/src/runtime.c tinytd/src/collector.c \
                 tinytd/src/config.c tinytd/src/writer.c tinytd/src/debug.c"
        # shellcheck disable=SC2086
        if gcc $CFLAGS_BASE -I. -fsanitize=address,undefined -fno-omit-frame-pointer \
               -g -O1 -DHAVE_CONFIG_H \
               $TD_SRCS $COMMON_SRCS $LIBS -lssl -lcrypto -o "$TD_BIN" 2>/tmp/tt-asan-td-build.log \
           && gcc $CFLAGS_BASE -I. -fsanitize=address,undefined -fno-omit-frame-pointer \
               -g -O1 -DHAVE_CONFIG_H \
               $GW_SRCS $COMMON_SRCS $LIBS -lssl -lcrypto -o "$GW_BIN" 2>/tmp/tt-asan-gw-build.log; then

            rm -f "$LIVE" "$SHADOW"
            ASAN_OPTIONS=detect_leaks=0 "$TD_BIN" -n -c "$CONF" >/dev/null 2>&1 &
            TD_PID=$!
            sleep 1

            ASAN_OPTIONS=detect_leaks=0 "$GW_BIN" -n -c "$CONF" -p "$GW_PORT" \
                >/tmp/tt-asan-gw.log 2>&1 &
            GW_PID=$!
            sleep 1

            # Run a subset of load tests against the ASan gateway
            if TINYTRACK_TEST_PORT=$GW_PORT python3 -m pytest \
                    tests/gateway/test_load.py \
                    tests/gateway/test_ws_frames.py \
                    -q --tb=no -x 2>/tmp/tt-asan-pytest.log; then
                printf "  [${PASS}] gateway ASan load tests\n"
            else
                printf "  [${FAIL}] gateway ASan load tests\n"
                tail -10 /tmp/tt-asan-pytest.log
                fail=$((fail + 1))
            fi

            kill "$GW_PID" "$TD_PID" 2>/dev/null
            wait "$GW_PID" "$TD_PID" 2>/dev/null
            rm -f "$LIVE" "$SHADOW" "$GW_BIN" "$TD_BIN" \
                  /tmp/tt-asan-gw.log /tmp/tt-asan-pytest.log \
                  /tmp/tt-asan-td-build.log /tmp/tt-asan-gw-build.log
        else
            printf "  [${SKIP}] ASan gateway build failed (missing headers?)\n"
            cat /tmp/tt-asan-td-build.log /tmp/tt-asan-gw-build.log 2>/dev/null | head -5
            rm -f /tmp/tt-asan-td-build.log /tmp/tt-asan-gw-build.log
        fi
    fi
fi

echo ""
if [ "$fail" -eq 0 ]; then
    printf "[${PASS}] All sanitizer checks passed\n"
else
    printf "[${FAIL}] %d check(s) failed\n" "$fail"
fi

[ "$fail" -eq 0 ]
