#!/bin/sh
# test_cli_binary.sh — Integration tests for the tiny-cli binary.
#
# Requires: built tiny-cli binary, running tinytd + tinytrack (optional).
# Tests that don't need a daemon are marked [no-daemon].
#
# Usage (from project root):
#   sh tests/cli/test_cli_binary.sh

set -u
cd "$(dirname "$0")/../.."

CLI="./cli/tiny-cli"
CONF="./tests/tinytrack.conf-test"
LIVE=$(grep live_path "$CONF" | awk '{print $3}')

PASS="\033[32mPASS\033[0m"
FAIL="\033[31mFAIL\033[0m"
SKIP="\033[33mSKIP\033[0m"

pass=0; fail=0; skip=0

check() {
    label="$1"; shift
    if "$@" >/dev/null 2>&1; then
        printf "  [${PASS}] %s\n" "$label"; pass=$((pass+1))
    else
        printf "  [${FAIL}] %s\n" "$label"; fail=$((fail+1))
    fi
}

check_output() {
    label="$1"; pattern="$2"; shift 2
    out=$("$@" 2>&1)
    if echo "$out" | grep -q "$pattern"; then
        printf "  [${PASS}] %s\n" "$label"; pass=$((pass+1))
    else
        printf "  [${FAIL}] %s (pattern '%s' not found)\n" "$label" "$pattern"
        fail=$((fail+1))
    fi
}

# ------------------------------------------------------------------ #
printf "\n=== tiny-cli binary tests ===\n"

if [ ! -x "$CLI" ]; then
    printf "  [${SKIP}] tiny-cli not built (run make first)\n"
    skip=$((skip+1))
    printf "\n  pass=%-3d fail=%-3d skip=%d\n" "$pass" "$fail" "$skip"
    exit 0
fi

# [no-daemon] --help exits 0 and prints usage
check_output "--help exits 0 with usage" "Usage:" "$CLI" --help

# [no-daemon] version command
check_output "version command" "tiny" "$CLI" version

# [no-daemon] unknown command exits non-zero
if "$CLI" unknowncmd >/dev/null 2>&1; then
    printf "  [${FAIL}] unknown command should exit non-zero\n"; fail=$((fail+1))
else
    printf "  [${PASS}] unknown command exits non-zero\n"; pass=$((pass+1))
fi

# [no-daemon] --format json flag accepted
check_output "--format json accepted" "" "$CLI" --format json --help

# [no-daemon] --no-color flag accepted
check_output "--no-color accepted" "" "$CLI" --no-color --help

# [no-daemon] script with nonexistent file exits non-zero
if "$CLI" script /nonexistent/file.tts >/dev/null 2>&1; then
    printf "  [${FAIL}] script nonexistent should fail\n"; fail=$((fail+1))
else
    printf "  [${PASS}] script nonexistent exits non-zero\n"; pass=$((pass+1))
fi

# ------------------------------------------------------------------ #
# Daemon-dependent tests (skip if tinytd not running)
if [ -n "$LIVE" ] && [ -f "$LIVE" ]; then
    printf "\n  (daemon live file found — running daemon tests)\n"

    check_output "status command" "." "$CLI" -c "$CONF" -p "$LIVE" status
    check_output "metrics command" "cpu" "$CLI" -c "$CONF" -p "$LIVE" --format json metrics
    check_output "debug command" "." "$CLI" -c "$CONF" -p "$LIVE" debug
else
    printf "  [${SKIP}] daemon tests (tinytd not running)\n"
    skip=$((skip+3))
fi

# ------------------------------------------------------------------ #
printf "\n  pass=%-3d fail=%-3d skip=%d\n" "$pass" "$fail" "$skip"
[ "$fail" -eq 0 ]
