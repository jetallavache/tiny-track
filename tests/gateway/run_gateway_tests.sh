#!/bin/sh
# run_gateway_tests.sh — unified gateway test runner.
#
# Usage (from project root):
#   sh tests/gateway/run_gateway_tests.sh [suite...]
#
# Suites: ws http tls load sock js all
# Default: ws http sock js

set -u
cd "$(dirname "$0")/../.."

PASS="\033[32mPASS\033[0m"; FAIL="\033[31mFAIL\033[0m"; SKIP="\033[33mSKIP\033[0m"
fail=0; pass=0; skip=0

TEST_CONF="tests/tinytrack.conf-test"

check_tool() { command -v "$1" >/dev/null 2>&1; }

run_pytest() {
    label="$1"; shift
    if ! check_tool python3; then
        printf "  [${SKIP}] %s (python3 not found)\n" "$label"; skip=$((skip+1)); return
    fi
    if python3 -m pytest "$@" -v --tb=short 2>&1; then
        printf "  [${PASS}] %s\n" "$label"; pass=$((pass+1))
    else
        printf "  [${FAIL}] %s\n" "$label"
        fail=$((fail + 1))
    fi
}

suite_ws() {
    printf '\n=== WebSocket tests ===\n'
    run_pytest "ws" tests/gateway/test_ws.py
}

suite_http() {
    printf '\n=== HTTP tests ===\n'
    run_pytest "http" tests/gateway/test_http.py
}

suite_tls() {
    printf '\n=== TLS tests ===\n'
    if ! check_tool openssl; then
        printf "  [${SKIP}] TLS tests (openssl not found)\n"; skip=$((skip+1)); return
    fi
    run_pytest "tls" tests/gateway/test_tls.py
}

suite_load() {
    printf '\n=== Load tests ===\n'
    run_pytest "load" tests/gateway/test_load.py -v
}

suite_sock() {
    printf '\n=== Socket / epoll tests ===\n'
    run_pytest "sock" tests/gateway/test_sock.py
}

suite_js() {
    printf '\n=== JS integration tests ===\n'
    if ! check_tool node; then
        printf "  [${SKIP}] JS tests (node not found)\n"; skip=$((skip+1)); return
    fi
    if [ ! -d tests/gateway/node_modules ]; then
        (cd tests/gateway && npm install --silent 2>/dev/null)
    fi
    if sh tests/gateway/run_gateway_test.sh; then
        printf "  [${PASS}] test_gateway.js\n"; pass=$((pass+1))
    else
        printf "  [${FAIL}] test_gateway.js\n"
        fail=$((fail + 1))
    fi
}

suite_sanitize() {
    printf '\n=== Gateway sanitizer tests (ASan+UBSan) ===\n'
    if ! check_tool gcc; then
        printf "  [${SKIP}] sanitize (gcc not found)\n"; skip=$((skip+1)); return
    fi
    if ! check_tool python3; then
        printf "  [${SKIP}] sanitize (python3 not found)\n"; skip=$((skip+1)); return
    fi

    # Build tinytrack with ASan+UBSan
    ASAN_BIN="/tmp/tt-tinytrack-asan-$$"
    printf "  Building tinytrack with ASan+UBSan...\n"

    SRCS="gateway/src/main.c gateway/src/sock.c gateway/src/net.c \
          gateway/src/http.c gateway/src/ws.c gateway/src/session.c \
          gateway/src/event.c gateway/src/iobuf.c gateway/src/str.c \
          gateway/src/url.c gateway/src/b64.c gateway/src/proto.c \
          gateway/src/reader.c gateway/src/tls.c gateway/src/config.c \
          gateway/src/util.c gateway/src/printf.c \
          common/metrics.c common/timer.c \
          common/config/ini.c common/config/paths.c common/config/read.c \
          common/log/core.c common/log/stderr.c common/log/syslog.c \
          common/ringbuf/shm.c common/ringbuf/writer.c common/ringbuf/reader.c"

    # shellcheck disable=SC2086
    if ! gcc -std=c11 -g -O1 \
             -fsanitize=address,undefined -fno-omit-frame-pointer \
             -D_POSIX_C_SOURCE=200809L -D_GNU_SOURCE \
             -include config.h -I. \
             $SRCS -lrt -lssl -lcrypto \
             -o "$ASAN_BIN" 2>/tmp/tt-asan-build-$$.log; then
        printf "  [${SKIP}] ASan build failed (missing libs?)\n"
        grep "error:" /tmp/tt-asan-build-$$.log | head -5 | sed 's/^/    /'
        rm -f /tmp/tt-asan-build-$$.log
        skip=$((skip+1))
        return
    fi
    rm -f /tmp/tt-asan-build-$$.log
    printf "  ASan build OK\n"

    # Start tinytd + asan tinytrack
    ASAN_PORT=14029
    LIVE=$(grep live_path   "$TEST_CONF" | awk '{print $3}')
    SHADOW=$(grep shadow_path "$TEST_CONF" | awk '{print $3}')

    tinytd/tinytd -c tests/tinytrack.conf-test >/dev/null 2>&1 &
    TD_PID=$!
    sleep 1

    ASAN_LOG="/tmp/tt-asan-gw-$$.log"
    ASAN_OPTIONS="log_path=${ASAN_LOG}:detect_leaks=0" \
    UBSAN_OPTIONS="print_stacktrace=1:halt_on_error=0" \
        "$ASAN_BIN" -c tests/tinytrack.conf-test -p $ASAN_PORT >"$ASAN_LOG.stdout" 2>&1 &
    GW_PID=$!

    # Wait for gateway to be ready
    i=0
    while [ $i -lt 20 ]; do
        python3 -c "import socket; socket.create_connection(('127.0.0.1', $ASAN_PORT), 0.2)" 2>/dev/null && break
        sleep 0.2; i=$((i+1))
    done

    if ! kill -0 "$GW_PID" 2>/dev/null; then
        printf "  [${FAIL}] ASan gateway did not start\n"
        cat "$ASAN_LOG.stdout" | head -10 | sed 's/^/    /'
        kill "$TD_PID" 2>/dev/null; wait "$TD_PID" 2>/dev/null
        rm -f "$ASAN_BIN" "$ASAN_LOG"* /tmp/tt-asan-build-$$.log
        fail=$((fail + 1))
        return
    fi

    printf "  Running tests against ASan gateway (port %d)...\n" $ASAN_PORT

    # Run ws + http + sock + load tests against asan gateway
    if TINYTRACK_TEST_PORT=$ASAN_PORT \
       python3 -m pytest \
           tests/gateway/test_ws.py \
           tests/gateway/test_http.py \
           tests/gateway/test_sock.py \
           tests/gateway/test_load.py \
           --override-ini="addopts=" \
           -v --tb=short \
           -p no:warnings 2>&1; then
        printf "  [${PASS}] sanitize: no ASan/UBSan errors during tests\n"
    else
        printf "  [${FAIL}] sanitize: test failures under ASan\n"
        fail=$((fail + 1))
    fi

    # Check ASan log for errors (ASan writes to ${ASAN_LOG}.PID files)
    # Real ASan errors contain "AddressSanitizer:" or "runtime error:" (UBSan)
    asan_errors=0
    for f in "${ASAN_LOG}".*; do
        [ -f "$f" ] || continue
        if grep -qE "AddressSanitizer:|runtime error:" "$f" 2>/dev/null; then
            asan_errors=$((asan_errors + 1))
        fi
    done
    if [ $asan_errors -gt 0 ]; then
        printf "  [${FAIL}] ASan/UBSan errors detected:\n"
        for f in "${ASAN_LOG}".*; do
            [ -f "$f" ] || continue
            grep -A5 "AddressSanitizer:\|runtime error:" "$f" 2>/dev/null | head -20 | sed 's/^/    /'
        done
        fail=$((fail + 1))
    else
        printf "  [${PASS}] no ASan/UBSan errors in gateway log\n"
    fi

    kill "$GW_PID" "$TD_PID" 2>/dev/null
    wait "$GW_PID" "$TD_PID" 2>/dev/null
    rm -f "$ASAN_BIN" "${ASAN_LOG}"* /tmp/tt-asan-build-$$.log
    rm -f "$LIVE" "$SHADOW"
}

suite_valgrind() {
    printf '\n=== Gateway valgrind tests (memcheck) ===\n'
    if ! check_tool valgrind; then
        printf "  [${SKIP}] valgrind not installed\n"; return
    fi

    VALGRIND_PORT=14030
    LIVE=$(grep live_path "$TEST_CONF" | awk '{print $3}')
    VALGRIND_LOG="/tmp/tt-valgrind-gw-$$.log"

    # Ensure tinytd is running
    _td_pid=""
    if ! [ -f "$LIVE" ]; then
        tinytd/tinytd -c tests/tinytrack.conf-test >/dev/null 2>&1 &
        _td_pid=$!
        sleep 1
    fi

    printf "  Starting tinytrack under valgrind (port %d)...\n" $VALGRIND_PORT
    valgrind \
        --tool=memcheck \
        --leak-check=full \
        --show-leak-kinds=definite,indirect \
        --track-origins=yes \
        --error-exitcode=42 \
        --log-file="$VALGRIND_LOG" \
        gateway/tinytrack -c tests/tinytrack.conf-test -p $VALGRIND_PORT \
        >/dev/null 2>&1 &
    GW_PID=$!

    # Wait for gateway to be ready
    i=0
    while [ $i -lt 30 ]; do
        python3 -c "import socket; socket.create_connection(('127.0.0.1', $VALGRIND_PORT), 0.3)" 2>/dev/null && break
        sleep 0.3; i=$((i+1))
    done

    if ! kill -0 "$GW_PID" 2>/dev/null; then
        printf "  [${FAIL}] valgrind gateway did not start\n"
        [ -n "$_td_pid" ] && kill "$_td_pid" 2>/dev/null
        fail=$((fail + 1))
        return
    fi

    printf "  Running ws + http + sock tests against valgrind gateway...\n"
    TINYTRACK_TEST_PORT=$VALGRIND_PORT \
    python3 -m pytest \
        tests/gateway/test_ws.py \
        tests/gateway/test_http.py \
        tests/gateway/test_sock.py \
        -v --tb=short -p no:warnings 2>&1
    pytest_rc=$?

    # Graceful shutdown so valgrind can write leak report
    kill -TERM "$GW_PID" 2>/dev/null
    wait "$GW_PID" 2>/dev/null
    vg_rc=$?

    [ -n "$_td_pid" ] && kill "$_td_pid" 2>/dev/null; wait "$_td_pid" 2>/dev/null

    # Check valgrind results
    if [ $pytest_rc -ne 0 ]; then
        printf "  [${FAIL}] test failures under valgrind\n"
        fail=$((fail + 1))
    else
        printf "  [${PASS}] all tests passed under valgrind\n"
    fi

    if grep -q "ERROR SUMMARY: 0 errors" "$VALGRIND_LOG" 2>/dev/null; then
        printf "  [${PASS}] valgrind: 0 memory errors\n"
    else
        errors=$(grep "ERROR SUMMARY:" "$VALGRIND_LOG" 2>/dev/null | tail -1)
        printf "  [${FAIL}] valgrind: %s\n" "${errors:-no summary found}"
        grep -E "Invalid|Uninitialised|Use of|definitely lost" "$VALGRIND_LOG" 2>/dev/null \
            | head -10 | sed 's/^/    /'
        fail=$((fail + 1))
    fi

    if grep -q "definitely lost: 0 bytes" "$VALGRIND_LOG" 2>/dev/null; then
        printf "  [${PASS}] valgrind: no definite leaks\n"
    else
        leaks=$(grep "definitely lost:" "$VALGRIND_LOG" 2>/dev/null | tail -1)
        [ -n "$leaks" ] && printf "  [${FAIL}] valgrind: %s\n" "$leaks" && fail=$((fail + 1))
    fi

    rm -f "$VALGRIND_LOG"
}

SUITES="${*:-ws http tls load sock js}"

for suite in $SUITES; do
    case "$suite" in
        ws)       suite_ws ;;
        http)     suite_http ;;
        tls)      suite_tls ;;
        load)     suite_load ;;
        sock)     suite_sock ;;
        js)       suite_js ;;
        sanitize) suite_sanitize ;;
        valgrind) suite_valgrind ;;
        all)      suite_sock; suite_http; suite_ws; suite_tls; suite_load; suite_js; suite_sanitize; suite_valgrind ;;
        *)        printf "Unknown suite: %s\n" "$suite"; exit 1 ;;
    esac
done

printf '\n'
printf "  %-14s  pass=%-3d fail=%-3d skip=%d\n" "gateway" "$pass" "$fail" "$skip"
[ "$fail" -eq 0 ]
