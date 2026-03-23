#!/bin/sh

make clean 2>/dev/null
make distclean 2>/dev/null

rm -rf autom4te.cache/ aclocal.m4 ar-lib compile config.* \
       configure configure~ depcomp install-sh missing stamp-h1 \
       Makefile Makefile.in **/Makefile **/Makefile.in \
       **/*/.deps/
