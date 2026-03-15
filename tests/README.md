TinyTrack Tests
===============

This directory contains tests for TinyTrack components.

Manual Tests
------------

### Gateway WebSocket Test

Located in `manual-gateway-test/`:

- `index.html` - WebSocket client
- `script.js` - Client implementation
- `README.md` - Usage instructions

Run:
```bash
cd manual-gateway-test
python3 -m http.server 8000
# Open http://localhost:8000 in browser
```

Performance Tests
-----------------

### Benchmark Suite

`bench_performance.c` - Comprehensive performance benchmarks:

- Writer throughput (ops/sec)
- Reader throughput (ops/sec)
- Concurrent readers scalability
- Seqlock contention rate
- Memory usage analysis

Run:
```bash
./run_benchmark.sh
```

Expected results (typical hardware):
- Writer: ~1-2M ops/sec
- Reader: ~5-10M ops/sec
- Memory: ~1.5 MB per process

### Seqlock Correctness Test

`test_seqlock.c` - Validates lock-free synchronization:

- Multi-threaded stress test
- Detects torn reads
- Verifies data consistency
- 8 concurrent readers, 10 second duration

Run:
```bash
./run_seqlock_test.sh
```

Expected: 0% inconsistent reads (✅ PASS)

Building Tests Manually
------------------------

```bash
# Benchmark
gcc -O2 -std=c11 -pthread -I. \
    tests/bench_performance.c \
    common/ring/writer.c \
    common/ring/reader.c \
    common/ring/shm.c \
    common/sink/core.c \
    -lrt -o bench_performance

# Seqlock test
gcc -O2 -std=c11 -pthread -I. \
    tests/test_seqlock.c \
    common/ring/writer.c \
    common/ring/reader.c \
    common/ring/shm.c \
    common/sink/core.c \
    -lrt -o test_seqlock
```

Notes
-----

- Tests use `/dev/shm` for shared memory
- Requires root or proper permissions
- Clean up with `rm /dev/shm/tinytd-*` if needed

