#!/bin/bash

set -e

echo "Building benchmark..."
gcc -O2 -std=c11 -pthread \
    -I. \
    tests/bench_performance.c \
    common/ring/writer.c \
    common/ring/reader.c \
    common/ring/shm.c \
    common/sink/core.c \
    common/sink/stderr.c \
    common/sink/syslog.c \
    -lrt -o bench_performance

echo "Running benchmark..."
./bench_performance

echo ""
echo "Cleaning up..."
rm -f bench_performance
