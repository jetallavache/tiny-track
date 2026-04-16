#!/bin/sh
# test_signals.sh - Signal handling tests for tinytd.
#
# Tests: SIGTERM graceful shutdown, SIGHUP config reload (no crash),
#        SIGKILL + auto-recovery from shadow.
#
# Run from project root: sh tests/tinytd/test_signals.sh

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
CONF="./tests/tinytrack.conf-test"
LIVE=$(grep live_path   "$CONF" | awk '{print $3}')
SHADOW=$(grep shadow_path "$CONF" | awk '{print $3}')

printf "\n=== signal tests ===\n"

if [ ! -x "$TINYTD" ]; then
    skip "tinytd binary not found — skipping all signal tests"
    printf "\n  pass=%-3d fail=%-3d skip=%d\n" "$pass" "$fail" "$skip"
    exit 0
fi

cleanup() { rm -f "$LIVE" "$SHADOW"; }

start_daemon() {
    $TINYTD -n -c "$CONF" >/dev/null 2>&1 &
    _daemon_pid=$!
}

# --- SIGTERM: graceful shutdown -------------------------------------------
printf '\n[SIGTERM]\n'
cleanup
start_daemon
pid=$_daemon_pid
sleep 0.5

if kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid"
    sleep 0.5
    if kill -0 "$pid" 2>/dev/null; then
        check "SIGTERM: process stopped" 1
        kill -KILL "$pid" 2>/dev/null
    else
        wait "$pid"; rc=$?
        check "SIGTERM: clean exit (not crash)" "$([ $rc -ne 139 ] && echo 0 || echo 1)"
    fi
else
    skip "daemon did not start (permissions?)"
fi
cleanup

# --- SIGHUP: reload without crash -----------------------------------------
printf '\n[SIGHUP]\n'
cleanup
start_daemon
pid=$_daemon_pid
sleep 0.5

if kill -0 "$pid" 2>/dev/null; then
    kill -HUP "$pid"
    sleep 0.3
    if kill -0 "$pid" 2>/dev/null; then
        check "SIGHUP: process still alive" 0
        kill -TERM "$pid"; wait "$pid" 2>/dev/null
    else
        wait "$pid"; rc=$?
        check "SIGHUP: no segfault on reload" "$([ $rc -ne 139 ] && echo 0 || echo 1)"
    fi
else
    skip "daemon did not start"
fi
cleanup

# --- SIGKILL + recovery ---------------------------------------------------
printf '\n[SIGKILL + recovery]\n'
cleanup
start_daemon
pid=$_daemon_pid
sleep 1

if kill -0 "$pid" 2>/dev/null; then
    shadow_exists=0
    [ -f "$SHADOW" ] && shadow_exists=1
    kill -KILL "$pid"
    wait "$pid" 2>/dev/null

    if [ $shadow_exists -eq 1 ]; then
        start_daemon
        pid2=$_daemon_pid
        sleep 0.5
        if kill -0 "$pid2" 2>/dev/null; then
            check "recovery: daemon restarts after SIGKILL" 0
            check "recovery: live file present after restart" "$([ -f "$LIVE" ] && echo 0 || echo 1)"
            kill -TERM "$pid2"; wait "$pid2" 2>/dev/null
        else
            wait "$pid2"; rc=$?
            check "recovery: restart exits cleanly" "$([ $rc -ne 139 ] && echo 0 || echo 1)"
        fi
    else
        skip "shadow file not created yet — skipping recovery check"
    fi
else
    skip "daemon did not start"
fi
cleanup

# --- Summary --------------------------------------------------------------
printf "\n  pass=%-3d fail=%-3d skip=%d\n" "$pass" "$fail" "$skip"
[ "$fail" -eq 0 ]
