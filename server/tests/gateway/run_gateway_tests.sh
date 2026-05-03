#!/bin/sh
# run_gateway_tests.sh — unified gateway test runner.
#
# Usage (from project root):
#   sh tests/gateway/run_gateway_tests.sh [suite...]
#
# Suites: ws http tls load sock js sysinfo docker sanitize valgrind all
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
    run_pytest "http" tests/gateway/test_http.py tests/gateway/test_http_parser.py
}

suite_ws_frames() {
    printf '\n=== WS frame edge-case tests ===\n'
    run_pytest "ws_frames" tests/gateway/test_ws_frames.py
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

suite_docker() {
    printf '\n=== Docker integration tests (full gateway suite in container) ===\n'
    if ! check_tool python3; then
        printf "  [${SKIP}] docker (python3 not found)\n"; skip=$((skip+1)); return
    fi
    if ! command -v docker >/dev/null 2>&1; then
        printf "  [${SKIP}] docker (docker not found)\n"; skip=$((skip+1)); return
    fi
    if ! docker info >/dev/null 2>&1; then
        printf "  [${SKIP}] docker (daemon not accessible)\n"; skip=$((skip+1)); return
    fi

    printf "  Building Docker image...\n"
    if ! docker build -t tinytrack-test:latest . --quiet 2>&1; then
        printf "  [${FAIL}] docker image build failed\n"; fail=$((fail+1)); return
    fi

    # Run sysinfo test (host data via bind-mounted /proc)
    if python3 -m pytest tests/gateway/test_sysinfo.py::test_sysinfo_docker \
               -v --tb=short 2>&1; then
        printf "  [${PASS}] docker sysinfo\n"; pass=$((pass+1))
    else
        printf "  [${FAIL}] docker sysinfo\n"; fail=$((fail+1))
    fi

    # Run full gateway test suite against the container
    DOCKER_PORT=14032
    CONTAINER=tinytrack-docker-suite-$$
    docker rm -f "$CONTAINER" 2>/dev/null || true

    docker run -d --name "$CONTAINER" \
        -v /proc:/host/proc:ro \
        -v /:/host/rootfs:ro \
        -v /dev/shm:/dev/shm \
        -p "${DOCKER_PORT}:25015" \
        -e TT_PROC_ROOT=/host/proc \
        -e TT_ROOTFS_PATH=/host/rootfs \
        tinytrack-test:latest >/dev/null

    # Wait for gateway to be ready
    i=0
    while [ $i -lt 40 ]; do
        python3 -c "import socket; socket.create_connection(('127.0.0.1', $DOCKER_PORT), 0.3)" \
            2>/dev/null && break
        sleep 0.3; i=$((i+1))
    done

    if ! python3 -c "import socket; socket.create_connection(('127.0.0.1', $DOCKER_PORT), 0.3)" 2>/dev/null; then
        printf "  [${FAIL}] docker container did not start\n"
        docker logs "$CONTAINER" 2>&1 | tail -10 | sed 's/^/    /'
        docker rm -f "$CONTAINER" 2>/dev/null
        fail=$((fail+1)); return
    fi

    if TINYTRACK_TEST_PORT=$DOCKER_PORT \
       python3 -m pytest \
           tests/gateway/test_ws.py \
           tests/gateway/test_http.py \
           tests/gateway/test_sock.py \
           -v --tb=short 2>&1; then
        printf "  [${PASS}] docker gateway suite\n"; pass=$((pass+1))
    else
        printf "  [${FAIL}] docker gateway suite\n"; fail=$((fail+1))
    fi

    docker rm -f "$CONTAINER" 2>/dev/null
}

suite_docker_tls() {
    printf '\n=== Docker TLS tests (wss:// in container) ===\n'
    if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
        printf "  [${SKIP}] docker not available\n"; skip=$((skip+1)); return
    fi
    if ! check_tool openssl; then
        printf "  [${SKIP}] openssl not found\n"; skip=$((skip+1)); return
    fi
    if ! check_tool python3; then
        printf "  [${SKIP}] python3 not found\n"; skip=$((skip+1)); return
    fi

    CERT_DIR="/tmp/tt-docker-tls-$$"
    mkdir -p "$CERT_DIR"
    openssl req -x509 -newkey rsa:2048 -keyout "$CERT_DIR/server.key" \
        -out "$CERT_DIR/server.crt" -days 1 -nodes \
        -subj "/CN=localhost" >/dev/null 2>&1

    TLS_PORT=14033
    CONTAINER=tinytrack-docker-tls-$$
    docker rm -f "$CONTAINER" 2>/dev/null || true

    docker run -d --name "$CONTAINER" \
        -v /proc:/host/proc:ro \
        -v /:/host/rootfs:ro \
        -v /dev/shm:/dev/shm \
        -v "$CERT_DIR:/certs:ro" \
        -p "${TLS_PORT}:25015" \
        -e TT_PROC_ROOT=/host/proc \
        -e TT_ROOTFS_PATH=/host/rootfs \
        -e TT_TLS=true \
        -e TT_TLS_CERT=/certs/server.crt \
        -e TT_TLS_KEY=/certs/server.key \
        tinytrack-test:latest >/dev/null

    i=0
    while [ $i -lt 40 ]; do
        python3 -c "import socket; socket.create_connection(('127.0.0.1', $TLS_PORT), 0.3)" \
            2>/dev/null && break
        sleep 0.3; i=$((i+1))
    done

    if ! python3 -c "import socket; socket.create_connection(('127.0.0.1', $TLS_PORT), 0.3)" 2>/dev/null; then
        printf "  [${FAIL}] docker TLS container did not start\n"
        docker logs "$CONTAINER" 2>&1 | tail -10 | sed 's/^/    /'
        docker rm -f "$CONTAINER" 2>/dev/null
        rm -rf "$CERT_DIR"
        fail=$((fail+1)); return
    fi

    if TINYTRACK_TEST_PORT=$TLS_PORT \
       python3 -m pytest tests/gateway/test_docker_tls.py \
               -v --tb=short 2>&1; then
        printf "  [${PASS}] docker TLS suite\n"; pass=$((pass+1))
    else
        printf "  [${FAIL}] docker TLS suite\n"; fail=$((fail+1))
    fi

    docker rm -f "$CONTAINER" 2>/dev/null
    rm -rf "$CERT_DIR"
}

suite_sysinfo() {
    printf '\n=== sysinfo tests (host + docker) ===\n'
    if ! check_tool python3; then
        printf "  [${SKIP}] sysinfo (python3 not found)\n"; skip=$((skip+1)); return
    fi

    # --- host mode ---
    if python3 -m pytest tests/gateway/test_sysinfo.py::test_sysinfo_host \
                         tests/gateway/test_sysinfo.py::test_sysinfo_intervals_match_config \
               -v --tb=short 2>&1; then
        printf "  [${PASS}] sysinfo host\n"; pass=$((pass+1))
    else
        printf "  [${FAIL}] sysinfo host\n"; fail=$((fail+1))
    fi

    # --- docker mode ---
    if ! command -v docker >/dev/null 2>&1; then
        printf "  [${SKIP}] sysinfo docker (docker not found)\n"; skip=$((skip+1)); return
    fi
    if ! docker info >/dev/null 2>&1; then
        printf "  [${SKIP}] sysinfo docker (docker daemon not accessible)\n"; skip=$((skip+1)); return
    fi

    printf "  Building Docker image...\n"
    if ! docker build -t tinytrack-test:latest . --quiet 2>&1; then
        printf "  [${FAIL}] sysinfo docker (image build failed)\n"; fail=$((fail+1)); return
    fi

    if python3 -m pytest tests/gateway/test_sysinfo.py::test_sysinfo_docker \
               -v --tb=short 2>&1; then
        printf "  [${PASS}] sysinfo docker\n"; pass=$((pass+1))
    else
        printf "  [${FAIL}] sysinfo docker\n"; fail=$((fail+1))
    fi
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
          common/metrics.c common/timer.c common/sysfs.c \
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

    # Start tinytd + asan tinytrack (use isolated live/shadow paths)
    ASAN_PORT=14029
    ASAN_LIVE="/tmp/tinytd-asan-live.dat"
    ASAN_SHADOW="/tmp/tinytd-asan-shadow.dat"
    rm -f "$ASAN_LIVE" "$ASAN_SHADOW"

    # Build isolated config with separate storage paths
    ASAN_CONF="/tmp/tt-asan-conf-$$.ini"
    sed -e "s|live_path.*=.*|live_path = $ASAN_LIVE|" \
        -e "s|shadow_path.*=.*|shadow_path = $ASAN_SHADOW|" \
        "$TEST_CONF" > "$ASAN_CONF"

    # Kill any process still holding ASAN_PORT
    fuser -k ${ASAN_PORT}/tcp 2>/dev/null || \
        ss -tlnp "sport = :${ASAN_PORT}" 2>/dev/null | awk 'NR>1{match($6,/pid=([0-9]+)/,a); if(a[1]) system("kill "a[1])}' || true
    sleep 0.3

    # Wait for port to be free
    i=0
    while [ $i -lt 20 ]; do
        python3 -c "import socket; socket.create_connection(('127.0.0.1', $ASAN_PORT), 0.1)" 2>/dev/null || break
        sleep 0.2; i=$((i+1))
    done

    tinytd/tinytd --no-daemon -c "$ASAN_CONF" >/dev/null 2>&1 &
    TD_PID=$!
    # Wait for live file
    i=0
    while [ $i -lt 30 ] && [ ! -f "$ASAN_LIVE" ]; do sleep 0.2; i=$((i+1)); done

    ASAN_LOG="/tmp/tt-asan-gw-$$.log"
    ASAN_OPTIONS="log_path=${ASAN_LOG}:detect_leaks=0" \
    UBSAN_OPTIONS="print_stacktrace=1:halt_on_error=0" \
        "$ASAN_BIN" --no-daemon -c "$ASAN_CONF" -p $ASAN_PORT >"$ASAN_LOG.stdout" 2>&1 &
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
    rm -f "$ASAN_LIVE" "$ASAN_SHADOW" "$ASAN_CONF"
}

suite_valgrind() {
    printf '\n=== Gateway valgrind tests (memcheck) ===\n'
    if ! check_tool valgrind; then
        printf "  [${SKIP}] valgrind not installed\n"; return
    fi

    VALGRIND_PORT=14030
    VG_LIVE="/tmp/tinytd-vg-live.dat"
    VG_SHADOW="/tmp/tinytd-vg-shadow.dat"
    VALGRIND_LOG="/tmp/tt-valgrind-gw-$$.log"
    rm -f "$VG_LIVE" "$VG_SHADOW"

    VG_CONF="/tmp/tt-vg-conf-$$.ini"
    sed -e "s|live_path.*=.*|live_path = $VG_LIVE|" \
        -e "s|shadow_path.*=.*|shadow_path = $VG_SHADOW|" \
        "$TEST_CONF" > "$VG_CONF"

    # Kill any process still holding VALGRIND_PORT
    fuser -k ${VALGRIND_PORT}/tcp 2>/dev/null || \
        ss -tlnp "sport = :${VALGRIND_PORT}" 2>/dev/null | awk 'NR>1{match($6,/pid=([0-9]+)/,a); if(a[1]) system("kill "a[1])}' || true
    sleep 0.3

    # Wait for port to be free
    i=0
    while [ $i -lt 20 ]; do
        python3 -c "import socket; socket.create_connection(('127.0.0.1', $VALGRIND_PORT), 0.1)" 2>/dev/null || break
        sleep 0.2; i=$((i+1))
    done

    _td_pid=""
    tinytd/tinytd --no-daemon -c "$VG_CONF" >/dev/null 2>&1 &
    _td_pid=$!
    i=0
    while [ $i -lt 30 ] && [ ! -f "$VG_LIVE" ]; do sleep 0.2; i=$((i+1)); done

    printf "  Starting tinytrack under valgrind (port %d)...\n" $VALGRIND_PORT
    valgrind \
        --tool=memcheck \
        --leak-check=full \
        --show-leak-kinds=definite,indirect \
        --track-origins=yes \
        --error-exitcode=42 \
        --log-file="$VALGRIND_LOG" \
        gateway/tinytrack --no-daemon -c "$VG_CONF" -p $VALGRIND_PORT \
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
    WS_TIMEOUT=30 \
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

    rm -f "$VALGRIND_LOG" "$VG_LIVE" "$VG_SHADOW" "$VG_CONF"
}

suite_auth() {
    printf '\n=== Authentication tests ===\n'
    run_pytest "auth" tests/gateway/test_auth.py
}

SUITES="${*:-ws http tls load sock js}"

for suite in $SUITES; do
    case "$suite" in
        auth)     suite_auth ;;
        ws)       suite_ws ;;
        http)     suite_http ;;
        ws_frames) suite_ws_frames ;;
        tls)      suite_tls ;;
        load)     suite_load ;;
        sock)     suite_sock ;;
        js)       suite_js ;;
        sysinfo)     suite_sysinfo ;;
        docker)      suite_docker ;;
        docker-tls)  suite_docker_tls ;;
        sanitize) suite_sanitize ;;
        valgrind) suite_valgrind ;;
        all)      suite_sock; suite_http; suite_ws; suite_ws_frames; suite_auth; suite_tls; suite_load; suite_js; suite_sysinfo; suite_sanitize; suite_valgrind ;;
        *)        printf "Unknown suite: %s\n" "$suite"; exit 1 ;;
    esac
done

printf '\n'
printf "  %-14s  pass=%-3d fail=%-3d skip=%d\n" "gateway" "$pass" "$fail" "$skip"
[ "$fail" -eq 0 ]
