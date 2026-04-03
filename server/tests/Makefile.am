# tests/Makefile.am

AM_CFLAGS  = -std=c11 -Wall -Wextra -I$(top_srcdir) -pthread \
             -D_POSIX_C_SOURCE=200809L -D_GNU_SOURCE
AM_LDFLAGS = -lrt

COMMON_SRCS = \
    $(top_srcdir)/common/metrics.c \
    $(top_srcdir)/common/timer.c \
    $(top_srcdir)/common/config/ini.c \
    $(top_srcdir)/common/config/paths.c \
    $(top_srcdir)/common/config/read.c \
    $(top_srcdir)/common/log/core.c \
    $(top_srcdir)/common/log/stderr.c \
    $(top_srcdir)/common/log/syslog.c \
    $(top_srcdir)/common/ringbuf/shm.c \
    $(top_srcdir)/common/ringbuf/writer.c \
    $(top_srcdir)/common/ringbuf/reader.c

# ---------------------------------------------------------------------------
# Autotools check_PROGRAMS (unit + integration)
# ---------------------------------------------------------------------------
check_PROGRAMS = \
    unit/test_ringbuf \
    unit/test_metrics \
    unit/test_config \
    unit/test_shm \
    integration/test_shm_ipc \
    integration/test_shadow_sync \
    integration/test_seqlock

unit_test_ringbuf_SOURCES            = unit/test_ringbuf.c            $(COMMON_SRCS)
unit_test_metrics_SOURCES            = unit/test_metrics.c            $(COMMON_SRCS)
unit_test_config_SOURCES             = unit/test_config.c             $(COMMON_SRCS)
unit_test_shm_SOURCES                = unit/test_shm.c                $(COMMON_SRCS)
integration_test_shm_ipc_SOURCES     = integration/test_shm_ipc.c     $(COMMON_SRCS)
integration_test_shadow_sync_SOURCES = integration/test_shadow_sync.c $(COMMON_SRCS)
integration_test_seqlock_SOURCES     = integration/test_seqlock.c     $(COMMON_SRCS)

TESTS = \
    unit/test_ringbuf \
    unit/test_metrics \
    unit/test_config \
    unit/test_shm \
    integration/test_shm_ipc \
    integration/test_shadow_sync \
    integration/test_seqlock

# ---------------------------------------------------------------------------
# Unified runner targets  (all delegate to run_tests.sh)
# ---------------------------------------------------------------------------
RUN = sh $(srcdir)/run_tests.sh

test-fast:
	@$(RUN) static tinytd cli

test-smoke:
	@$(RUN) tinytd cli

test-unit:
	@$(RUN) tinytd cli

test-integration:
	@$(RUN) tinytd cli

test-system:
	@$(RUN) tinytd cli

test-perf:
	@$(RUN) tinytd

test-bench:
	@$(RUN) bench

test-gateway:
	@$(RUN) gateway

test-sanitize:
	@$(RUN) sanitize

test-static:
	@$(RUN) static

test-all:
	@$(RUN) all

EXTRA_DIST = \
    README.md \
    tinytrack.conf-test \
    run_tests.sh \
    bench/bench_performance.c \
    system/test_smoke.sh \
    system/test_signals.sh \
    system/test_perf.sh \
    sanitize/run_sanitizers.sh \
    static/run_static.sh
