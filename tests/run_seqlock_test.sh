#!/bin/bash

set -e

echo "Building seqlock test..."
gcc -O2 -std=c11 -pthread \
    -I. \
    tests/test_seqlock.c \
    common/ring/writer.c \
    common/ring/reader.c \
    common/ring/shm.c \
    common/sink/core.c \
    -lrt -o test_seqlock

echo "Running test..."
./test_seqlock

echo ""
echo "Cleaning up..."
rm -f test_seqlock
