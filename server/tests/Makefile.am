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
    tinytd/test_ringbuf \
    tinytd/test_metrics \
    tinytd/test_config \
    tinytd/test_shm \
    tinytd/test_shm_ipc \
    tinytd/test_shadow_sync \
    tinytd/test_seqlock

tinytd_test_ringbuf_SOURCES     = tinytd/test_ringbuf.c     $(COMMON_SRCS)
tinytd_test_metrics_SOURCES     = tinytd/test_metrics.c     $(COMMON_SRCS)
tinytd_test_config_SOURCES      = tinytd/test_config.c      $(COMMON_SRCS)
tinytd_test_shm_SOURCES         = tinytd/test_shm.c         $(COMMON_SRCS)
tinytd_test_shm_ipc_SOURCES     = tinytd/test_shm_ipc.c     $(COMMON_SRCS)
tinytd_test_shadow_sync_SOURCES = tinytd/test_shadow_sync.c $(COMMON_SRCS)
tinytd_test_seqlock_SOURCES     = tinytd/test_seqlock.c     $(COMMON_SRCS)

TESTS = \
    tinytd/test_ringbuf \
    tinytd/test_metrics \
    tinytd/test_config \
    tinytd/test_shm \
    tinytd/test_shm_ipc \
    tinytd/test_shadow_sync \
    tinytd/test_seqlock

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
    gateway/test_tls.py \
    gateway/test_sock.py \
    gateway/test_load.py \
    gateway/test_sysinfo.py \
    gateway/run_gateway_tests.sh \
    gateway/run_gateway_test.sh \
    gateway/package.json \
    gateway/test_gateway.js \
    gateway/test_gateway_extended.js
