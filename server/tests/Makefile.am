# tests/Makefile.am

AM_CFLAGS  = -std=c11 -Wall -Wextra -I$(top_srcdir) -pthread \
             -D_POSIX_C_SOURCE=200809L -D_GNU_SOURCE
AM_LDFLAGS = -lrt

COMMON_SRCS = \
    $(top_srcdir)/common/metrics.c \
    $(top_srcdir)/common/timer.c \
    $(top_srcdir)/common/sysfs.c \
    $(top_srcdir)/common/config/ini.c \
    $(top_srcdir)/common/config/paths.c \
    $(top_srcdir)/common/config/read.c \
    $(top_srcdir)/common/log/core.c \
    $(top_srcdir)/common/log/stderr.c \
    $(top_srcdir)/common/log/syslog.c \
    $(top_srcdir)/common/ringbuf/shm.c \
    $(top_srcdir)/common/ringbuf/writer.c \
    $(top_srcdir)/common/ringbuf/reader.c

check_PROGRAMS = \
    tinytd/test_ringbuf.bin \
    tinytd/test_metrics.bin \
    tinytd/test_config.bin \
    tinytd/test_shm.bin \
    tinytd/test_shm_ipc.bin \
    tinytd/test_shadow_sync.bin \
    tinytd/test_seqlock.bin

tinytd_test_ringbuf_bin_SOURCES     = tinytd/test_ringbuf.c     $(COMMON_SRCS)
tinytd_test_metrics_bin_SOURCES     = tinytd/test_metrics.c     $(COMMON_SRCS)
tinytd_test_config_bin_SOURCES      = tinytd/test_config.c      $(COMMON_SRCS)
tinytd_test_shm_bin_SOURCES         = tinytd/test_shm.c         $(COMMON_SRCS)
tinytd_test_shm_ipc_bin_SOURCES     = tinytd/test_shm_ipc.c     $(COMMON_SRCS)
tinytd_test_shadow_sync_bin_SOURCES = tinytd/test_shadow_sync.c $(COMMON_SRCS)
tinytd_test_seqlock_bin_SOURCES     = tinytd/test_seqlock.c     $(COMMON_SRCS)

TESTS = \
    tinytd/test_ringbuf.bin \
    tinytd/test_metrics.bin \
    tinytd/test_config.bin \
    tinytd/test_shm.bin \
    tinytd/test_shm_ipc.bin \
    tinytd/test_shadow_sync.bin \
    tinytd/test_seqlock.bin

# ---------------------------------------------------------------------------
# Test targets (delegate to run_tests.sh)
# ---------------------------------------------------------------------------
RUN = sh $(srcdir)/run_tests.sh

test-fast:
	@$(RUN) static tinytd cli

test-unit:
	@$(RUN) tinytd cli

test-gateway:
	@$(RUN) gateway

test-docker:
	@$(RUN) docker

test-sanitize:
	@$(RUN) sanitize

test-static:
	@$(RUN) static

test-bench:
	@$(RUN) bench

test-all:
	@$(RUN) all

# check-local runs after the automake C unit tests; adds pytest gateway suite
# when python3 is available. Failures here do NOT affect `make check` exit code
# unless GATEWAY_TESTS=1 is set, keeping CI non-blocking by default.
check-local:
	@if command -v python3 >/dev/null 2>&1 && \
	    test -x $(top_builddir)/gateway/tinytrack; then \
	    echo "--- gateway pytest (make check-local) ---"; \
	    python3 -m pytest $(srcdir)/gateway/test_ws.py \
	                      $(srcdir)/gateway/test_http.py \
	                      $(srcdir)/gateway/test_http_parser.py \
	                      $(srcdir)/gateway/test_ws_frames.py \
	                      $(srcdir)/gateway/test_load.py \
	                      $(srcdir)/gateway/test_sock.py \
	                      -q --tb=short 2>&1 || \
	    { [ "$$GATEWAY_TESTS" = "1" ] && exit 1 || true; }; \
	fi

EXTRA_DIST = \
    README.md \
    tinytrack.conf-test \
    run_tests.sh \
    bench/bench_performance.c \
    tinytd/test_smoke.sh \
    tinytd/test_signals.sh \
    tinytd/test_perf.sh \
    cli/test_cli_binary.sh \
    sanitize/run_sanitizers.sh \
    static/run_static.sh \
    gateway/conftest.py \
    gateway/test_ws.py \
    gateway/test_http.py \
    gateway/test_http_parser.py \
    gateway/test_ws_frames.py \
    gateway/test_tls.py \
    gateway/test_sock.py \
    gateway/test_load.py \
    gateway/test_sysinfo.py \
    gateway/run_gateway_tests.sh \
    gateway/run_gateway_test.sh \
    gateway/package.json \
    gateway/test_gateway.js \
    gateway/test_gateway_extended.js
