#!/bin/sh
# test_smoke.sh - Smoke tests: binaries start, handle --help, no segfault.
#
# Exit 0 = all passed, 1 = failures.
# Run from project root: sh tests/tinytd/test_smoke.sh

set -u
cd "$(dirname "$0")/../.."

PASS="\033[32mPASS\033[0m"
FAIL="\033[31mFAIL\033[0m"
SKIP="\033[33mSKIP\033[0m"

pass=0; fail=0; skip=0

check() {
    label="$1"; cond="$2"
    if [ "$cond" = "0" ]; then
        printf "  [${PASS}] %s\n" "$label"; pass=$((pass+1))
    else
        printf "  [${FAIL}] %s\n" "$label"; fail=$((fail+1))
    fi
}

skip() { printf "  [${SKIP}] %s\n" "$1"; skip=$((skip+1)); }

TINYTD="./tinytd/tinytd"
TINYCLI="./cli/tiny-cli"
TINYTRACK="./gateway/tinytrack"
CONF="./tests/tinytrack.conf-test"
LIVE=$(grep live_path "$CONF" | awk '{print $3}')
SHADOW=$(grep shadow_path "$CONF" | awk '{print $3}')

printf "\n=== smoke tests ===\n"

# --- tinytd --help --------------------------------------------------------
printf '\n[tinytd]\n'
if [ ! -x "$TINYTD" ]; then
    skip "tinytd binary not found"
else
    $TINYTD --help >/dev/null 2>&1; rc=$?
    check "--help exits without segfault" "$([ $rc -ne 139 ] && echo 0 || echo 1)"

    $TINYTD --config "$CONF" --no-daemon >/dev/null 2>&1 &
    pid=$!
    sleep 0.3
    if kill -0 "$pid" 2>/dev/null; then
        check "tinytd starts with test config" 0
        kill "$pid" 2>/dev/null
        wait "$pid" 2>/dev/null
    else
        wait "$pid"; rc=$?
        check "tinytd exits cleanly (no crash)" "$([ $rc -ne 139 ] && echo 0 || echo 1)"
    fi
    rm -f "$LIVE" "$SHADOW"
fi

# --- tiny-cli --help ------------------------------------------------------
printf '\n[tiny-cli]\n'
if [ ! -x "$TINYCLI" ]; then
    skip "tiny-cli binary not found"
else
    $TINYCLI --help >/dev/null 2>&1; rc=$?
    check "--help exits without segfault" "$([ $rc -ne 139 ] && echo 0 || echo 1)"

    $TINYCLI status >/dev/null 2>&1; rc=$?
    check "status without daemon: no segfault" "$([ $rc -ne 139 ] && echo 0 || echo 1)"
fi

# --- tinytrack --help -----------------------------------------------------
printf '\n[tinytrack]\n'
if [ ! -x "$TINYTRACK" ]; then
    skip "tinytrack binary not found"
else
    $TINYTRACK --help >/dev/null 2>&1; rc=$?
    check "--help exits without segfault" "$([ $rc -ne 139 ] && echo 0 || echo 1)"
fi

# --- Summary --------------------------------------------------------------
printf "\n  pass=%-3d fail=%-3d skip=%d\n" "$pass" "$fail" "$skip"
[ "$fail" -eq 0 ]
