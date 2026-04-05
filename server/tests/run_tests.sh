#!/bin/sh
# run_tests.sh - Unified test runner for TinyTrack.
#
# Usage (from project root):
#   sh tests/run_tests.sh [suite...]
#
# Suites: static tinytd cli gateway bench sanitize all
# Default: static tinytd cli
#
# Examples:
#   sh tests/run_tests.sh                  # default fast suite
#   sh tests/run_tests.sh all              # everything
#   sh tests/run_tests.sh tinytd cli       # specific suites
#   sh tests/run_tests.sh bench            # benchmarks only (no pass/fail)

set -u
cd "$(dirname "$0")/.."

# --------------------------------------------------------------------------
# Colours
# --------------------------------------------------------------------------
RED='\033[31m'; GREEN='\033[32m'; YELLOW='\033[33m'; RESET='\033[0m'
PASS="${GREEN}PASS${RESET}"; FAIL="${RED}FAIL${RESET}"; SKIP="${YELLOW}SKIP${RESET}"

total_pass=0; total_fail=0; total_skip=0

suite_result() {   # suite_result SUITE PASS FAIL SKIP
    printf "\n  %-14s  pass=%-3d fail=%-3d skip=%d\n" "$1" "$2" "$3" "$4"
}

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
TEST_CONF="tests/tinytrack.conf-test"
LIVE_PATH="/tmp/tinytd-test-live.dat"
SHADOW_PATH="/tmp/tinytd-test-shadow.dat"

CFLAGS_BASE="-std=c11 -I. -pthread -D_POSIX_C_SOURCE=200809L -D_GNU_SOURCE"
COMMON_SRCS="common/metrics.c common/timer.c common/sysfs.c \
             common/config/ini.c common/config/paths.c common/config/read.c \
             common/log/core.c common/log/stderr.c common/log/syslog.c \
             common/ringbuf/shm.c common/ringbuf/writer.c common/ringbuf/reader.c"
CLI_SRCS="cli/src/ctx.c cli/src/config.c cli/src/output.c cli/src/reader.c \
          cli/src/display.c"
LIBS="-lrt"

build_and_run() {   # build_and_run SRC [extra_cflags] [runner_prefix]
    src="$1"; extra="${2:-}"; runner="${3:-}"
    name=$(basename "$src" .c)
    bin="/tmp/tt-test-${name}-$$"

    # shellcheck disable=SC2086
    if ! gcc $CFLAGS_BASE $extra $src $COMMON_SRCS $LIBS -o "$bin" 2>/tmp/tt-build-$$.log; then
        printf "  [${FAIL}] build: %s\n" "$name"
        sed 's/^/    /' /tmp/tt-build-$$.log
        rm -f /tmp/tt-build-$$.log
        return 1
    fi
    rm -f /tmp/tt-build-$$.log

    if $runner "$bin" >/tmp/tt-run-$$.log 2>&1; then
        printf "  [${PASS}] %s\n" "$name"
        rm -f "$bin" /tmp/tt-run-$$.log
        return 0
    else
        printf "  [${FAIL}] %s\n" "$name"
        tail -20 /tmp/tt-run-$$.log | sed 's/^/    /'
        rm -f "$bin" /tmp/tt-run-$$.log
        return 1
    fi
}

build_and_run_cli() {   # build_and_run_cli SRC [extra_cflags]
    src="$1"; extra="${2:-}"
    name=$(basename "$src" .c)
    bin="/tmp/tt-test-${name}-$$"

    # shellcheck disable=SC2086
    if ! gcc $CFLAGS_BASE -include config.h $extra \
             $src $COMMON_SRCS $CLI_SRCS $LIBS \
             -o "$bin" 2>/tmp/tt-build-$$.log; then
        printf "  [${FAIL}] build: %s\n" "$name"
        sed 's/^/    /' /tmp/tt-build-$$.log
        rm -f /tmp/tt-build-$$.log
        return 1
    fi
    rm -f /tmp/tt-build-$$.log

    if "$bin" >/tmp/tt-run-$$.log 2>&1; then
        printf "  [${PASS}] %s\n" "$name"
        rm -f "$bin" /tmp/tt-run-$$.log
        return 0
    else
        printf "  [${FAIL}] %s\n" "$name"
        tail -20 /tmp/tt-run-$$.log | sed 's/^/    /'
        rm -f "$bin" /tmp/tt-run-$$.log
        return 1
    fi
}

run_shell() {   # run_shell SCRIPT
    script="$1"
    out=$( sh "$script" 2>&1 )
    rc=$?
    printf "%s\n" "$out"
    sk=$(printf "%s\n" "$out" | grep -c '\[.*SKIP.*\]' || true)
    _last_skip=$sk
    return $rc
}
_last_skip=0

check_tool() { command -v "$1" >/dev/null 2>&1; }

# --------------------------------------------------------------------------
# Suites
# --------------------------------------------------------------------------

suite_static() {
    printf "\n=== static analysis ===\n"
    p=0; f=0; s=0
    if check_tool cppcheck; then
        if cppcheck --enable=all --suppress=missingIncludeSystem \
                    --suppress=unusedFunction \
                    --suppress=constVariablePointer \
                    --suppress=constParameterPointer \
                    --suppress=variableScope \
                    --suppress=staticFunction \
                    --suppress=normalCheckLevelMaxBranches \
                    --suppress=unreadVariable \
                    --suppress=unusedVariable \
                    --error-exitcode=1 \
                    --std=c11 -I. \
                    common tinytd/src cli/src gateway/src \
                    2>/tmp/tt-cppcheck-$$.log; then
            printf "  [${PASS}] cppcheck\n"; p=$((p+1))
        else
            printf "  [${FAIL}] cppcheck\n"
            head -20 /tmp/tt-cppcheck-$$.log | sed 's/^/    /'
            f=$((f+1))
        fi
        rm -f /tmp/tt-cppcheck-$$.log
    else
        printf "  [${SKIP}] cppcheck (not installed)\n"; s=$((s+1))
    fi

    err=0
    for dir in common tinytd/src cli/src; do
        for file in "$dir"/*.c; do
            [ -f "$file" ] || continue
            # shellcheck disable=SC2086
            if ! gcc -std=c11 -O1 -Wall -Wextra -Werror \
                     -Wstrict-prototypes -fstack-protector-strong \
                     -D_POSIX_C_SOURCE=200809L -D_GNU_SOURCE \
                     -include config.h -I. -c "$file" -o /dev/null 2>/tmp/tt-wall-$$.log; then
                printf "  [${FAIL}] -Werror: %s\n" "$file"
                sed 's/^/    /' /tmp/tt-wall-$$.log
                err=$((err+1))
            fi
            rm -f /tmp/tt-wall-$$.log
        done
    done
    if [ $err -eq 0 ]; then
        printf "  [${PASS}] compile -Wall -Wextra -Werror\n"; p=$((p+1))
    else
        f=$((f+err))
    fi

    if check_tool sh; then
        if sh tests/static/run_static.sh 2>/dev/null; then
            printf "  [${PASS}] run_static.sh\n"; p=$((p+1))
        else
            printf "  [${FAIL}] run_static.sh\n"; f=$((f+1))
        fi
    fi

    suite_result "static" $p $f $s
    total_pass=$((total_pass+p)); total_fail=$((total_fail+f)); total_skip=$((total_skip+s))
}

suite_tinytd() {
    printf "\n=== tinytd tests (unit + integration + system) ===\n"
    p=0; f=0; s=0

    for src in tests/tinytd/test_*.c; do
        [ -f "$src" ] || continue
        if build_and_run "$src" "" ""; then p=$((p+1)); else f=$((f+1)); fi
    done

    _td_pid=""
    if [ -x tinytd/tinytd ]; then
        tinytd/tinytd -c "$TEST_CONF" >/dev/null 2>&1 &
        _td_pid=$!
        sleep 1
    fi

    for script in tests/tinytd/test_*.sh; do
        [ -f "$script" ] || continue
        _last_skip=0
        if run_shell "$script"; then p=$((p+1)); else f=$((f+1)); fi
        s=$((s+_last_skip))
    done

    [ -n "$_td_pid" ] && kill "$_td_pid" 2>/dev/null; wait "$_td_pid" 2>/dev/null

    suite_result "tinytd" $p $f $s
    total_pass=$((total_pass+p)); total_fail=$((total_fail+f)); total_skip=$((total_skip+s))
}

suite_cli() {
    printf "\n=== tiny-cli tests ===\n"
    p=0; f=0; s=0

    for src in tests/cli/test_*.c; do
        [ -f "$src" ] || continue
        if build_and_run_cli "$src"; then p=$((p+1)); else f=$((f+1)); fi
    done

    _td_pid=""
    if [ -x tinytd/tinytd ]; then
        tinytd/tinytd -c "$TEST_CONF" >/dev/null 2>&1 &
        _td_pid=$!
        sleep 1
    fi

    for script in tests/cli/test_*.sh; do
        [ -f "$script" ] || continue
        _last_skip=0
        if run_shell "$script"; then p=$((p+1)); else f=$((f+1)); fi
        s=$((s+_last_skip))
    done

    [ -n "$_td_pid" ] && kill "$_td_pid" 2>/dev/null; wait "$_td_pid" 2>/dev/null

    suite_result "cli" $p $f $s
    total_pass=$((total_pass+p)); total_fail=$((total_fail+f)); total_skip=$((total_skip+s))
}

suite_gateway() {
    printf "\n=== gateway (tinytrack) tests ===\n"
    p=0; f=0
    if sh tests/gateway/run_gateway_tests.sh all; then
        p=$((p+1))
    else
        f=$((f+1))
    fi
    if sh tests/gateway/run_gateway_tests.sh sysinfo; then
        p=$((p+1))
    else
        f=$((f+1))
    fi
    suite_result "gateway" $p $f 0
    total_pass=$((total_pass+p)); total_fail=$((total_fail+f))
}

suite_docker() {
    printf "\n=== docker integration tests ===\n"
    p=0; f=0; s=0
    if ! check_tool docker; then
        printf "  [${SKIP}] docker not found\n"; s=$((s+1))
        suite_result "docker" 0 0 $s
        total_skip=$((total_skip+s)); return
    fi
    if ! docker info >/dev/null 2>&1; then
        printf "  [${SKIP}] docker daemon not accessible\n"; s=$((s+1))
        suite_result "docker" 0 0 $s
        total_skip=$((total_skip+s)); return
    fi
    if sh tests/gateway/run_gateway_tests.sh docker; then
        p=$((p+1))
    else
        f=$((f+1))
    fi
    suite_result "docker" $p $f $s
    total_pass=$((total_pass+p)); total_fail=$((total_fail+f)); total_skip=$((total_skip+s))
}

suite_bench() {
    printf "\n=== benchmarks (informational, no pass/fail) ===\n"
    bin="/tmp/tt-bench-$$"
    # shellcheck disable=SC2086
    if gcc -O2 $CFLAGS_BASE \
           tests/bench/bench_performance.c $COMMON_SRCS $LIBS \
           -o "$bin" 2>/tmp/tt-bench-build-$$.log; then
        "$bin"
    else
        printf "  [${FAIL}] bench build failed\n"
        sed 's/^/    /' /tmp/tt-bench-build-$$.log
        total_fail=$((total_fail+1))
    fi
    rm -f "$bin" /tmp/tt-bench-build-$$.log
}

suite_sanitize() {
    printf "\n=== sanitizers ===\n"
    p=0; f=0; s=0
    if ! check_tool gcc; then
        printf "  [${SKIP}] gcc not found\n"; s=$((s+1))
        suite_result "sanitize" 0 0 $s
        total_skip=$((total_skip+s)); return
    fi

    for src in tests/tinytd/test_*.c tests/cli/test_*.c; do
        [ -f "$src" ] || continue
        name=$(basename "$src" .c)
        extra_srcs="$COMMON_SRCS"
        echo "$src" | grep -q "tests/cli/" && extra_srcs="$COMMON_SRCS $CLI_SRCS"
        extra_flags="-include config.h"
        echo "$src" | grep -q "tests/tinytd/" && extra_flags=""

        bin="/tmp/tt-san-${name}-$$"
        # shellcheck disable=SC2086
        if gcc $CFLAGS_BASE $extra_flags \
               -fsanitize=address,undefined -fno-omit-frame-pointer -g -O1 \
               "$src" $extra_srcs $LIBS -o "$bin" 2>/tmp/tt-san-$$.log \
           && "$bin" >/dev/null 2>&1; then
            printf "  [${PASS}] asan+ubsan: %s\n" "$name"; p=$((p+1))
        else
            printf "  [${FAIL}] asan+ubsan: %s\n" "$name"; f=$((f+1))
        fi
        rm -f "$bin" /tmp/tt-san-$$.log

        if check_tool valgrind; then
            bin="/tmp/tt-vg-${name}-$$"
            # shellcheck disable=SC2086
            if gcc $CFLAGS_BASE $extra_flags -g -O0 \
                   "$src" $extra_srcs $LIBS -o "$bin" 2>/dev/null \
               && valgrind --error-exitcode=1 --leak-check=full --quiet \
                           "$bin" >/dev/null 2>&1; then
                printf "  [${PASS}] valgrind: %s\n" "$name"; p=$((p+1))
            else
                printf "  [${FAIL}] valgrind: %s\n" "$name"; f=$((f+1))
            fi
            rm -f "$bin"
        else
            printf "  [${SKIP}] valgrind: %s\n" "$name"; s=$((s+1))
        fi
    done

    suite_result "sanitize" $p $f $s
    total_pass=$((total_pass+p)); total_fail=$((total_fail+f)); total_skip=$((total_skip+s))
}

# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
SUITES="${*:-static tinytd cli}"

for suite in $SUITES; do
    case "$suite" in
        static)   suite_static ;;
        tinytd)   suite_tinytd ;;
        cli)      suite_cli ;;
        gateway)  suite_gateway ;;
        docker)   suite_docker ;;
        bench)    suite_bench ;;
        sanitize) suite_sanitize ;;
        all)      suite_static; suite_tinytd; suite_cli
                  suite_gateway; suite_docker; suite_sanitize ;;
        *)        printf "Unknown suite: %s\n" "$suite"; exit 1 ;;
    esac
done

# --------------------------------------------------------------------------
# Summary
# --------------------------------------------------------------------------
printf "\n========================================\n"
printf "  TOTAL  pass=%-3d fail=%-3d skip=%d\n" \
       "$total_pass" "$total_fail" "$total_skip"
printf "========================================\n"

[ "$total_fail" -eq 0 ]
