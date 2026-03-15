#!/bin/sh
# Run fault tolerance / shadow recovery test for tinytd.
# Must be run from the project root after `make`.

set -e
cd "$(dirname "$0")/.."

echo "Building test_recovery..."
gcc -std=c11 -D_POSIX_C_SOURCE=200809L \
    -Wall -Wextra \
    -I. \
    tests/test_recovery.c \
    common/ringbuf/shm.c \
    common/log/core.c \
    common/log/stderr.c \
    common/log/syslog.c \
    -lrt -o test_recovery

echo "Running..."
./test_recovery
STATUS=$?

rm -f test_recovery
exit $STATUS
