#!/bin/sh
# server/scripts/clean.sh — remove C build artifacts.
# Can be run standalone from server/ or called by root clean.sh.
set -e
SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SERVER_DIR"

# Build system
make clean     2>/dev/null || true
make distclean 2>/dev/null || true

# Autotools generated files
rm -f  aclocal.m4 ar-lib compile config.guess config.h config.h.in config.h.in~ \
       config.log config.status config.sub configure configure~ \
       depcomp install-sh missing stamp-h1 test-driver
rm -rf autom4te.cache/

# Generated Makefiles and dependency tracking
find . -name 'Makefile'    -not -path './.git/*' -delete
find . -name 'Makefile.in' -not -path './.git/*' -delete
find . -name '.deps'       -not -path './.git/*' -type d -exec rm -rf {} + 2>/dev/null || true
find . -name '.dirstamp'   -not -path './.git/*' -delete

# Compiled objects, libraries, binaries
find . \( -name '*.o' -o -name '*.a' \) -not -path './.git/*' -delete 2>/dev/null || true
rm -f tinytd/tinytd cli/tiny-cli gateway/tinytrack

# Coverage
rm -rf coverage-report/
find . \( -name '*.gcda' -o -name '*.gcno' -o -name '*.gcov' \) -delete 2>/dev/null || true

# Valgrind / sanitizer / static analysis logs
rm -f valgrind-*.log \
      /tmp/tt-valgrind-*.log /tmp/tt-asan-*.log* /tmp/tt-asan-*.stdout \
      /tmp/tt-cppcheck.log /tmp/tt-scan-build.log /tmp/tt-wall.log
rm -rf /tmp/tt-scan-build-report/

# Test runtime temp files
rm -f /tmp/tt-test-* /tmp/tt-bench-* /tmp/tt-san-* /tmp/tt-vg-* /tmp/tt-run-* /tmp/tt-build-*
rm -f /tmp/tinytd-test-live.dat /tmp/tinytd-test-shadow.dat /tmp/tinytd-test.pid
rm -f /tmp/tinytd-tls-live.dat  /tmp/tinytd-tls-shadow.dat
rm -f /tmp/tinytrack-test.pid

echo "server: clean done"
