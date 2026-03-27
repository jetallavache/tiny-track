#!/bin/sh

make clean 2>/dev/null
make distclean 2>/dev/null

# Autotools generated files
rm -rf autom4te.cache/ aclocal.m4 ar-lib compile config.* \
       configure configure~ depcomp install-sh missing stamp-h1 \
       Makefile Makefile.in **/Makefile **/Makefile.in \
       **/*/.deps/

# Coverage artifacts
rm -rf coverage-report/
find . -name '*.gcda' -o -name '*.gcno' -o -name '*.gcov' | xargs rm -f 2>/dev/null

# Valgrind reports
rm -f valgrind-*.log

# Test runtime files
rm -f /tmp/tinytd-test-live.dat /tmp/tinytd-test-shadow.dat
