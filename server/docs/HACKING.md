HACKING
=======

SOURCE LAYOUT
-------------

  common/              shared libraries
    ringbuf/           ring buffer (writer, reader, shm, seqlock)
    log/               logging (stderr, syslog, journal)
    config/            INI config parser
    metrics.h/c        tt_metrics structure
    sysfs.h/c          configurable /proc and rootfs paths
    timer.h/c          timerfd wrapper
    proto/             binary protocol v1/v2
  tinytd/src/          metrics collector daemon
  gateway/src/         WebSocket gateway
  cli/src/             CLI client
  tests/               test suites
  docs/                documentation
  etc/                 configs and systemd unit files


AUTOTOOLS
---------

After modifying Makefile.am or configure.ac:

  autoreconf -fi
  ./configure && make

Adding a new source file:

  1. Add to the appropriate _SOURCES in */Makefile.am
  2. autoreconf -fi && ./configure && make


CODE FORMATTING
---------------

  make format          apply clang-format
  make format-check    check without changes

Configuration: .clang-format in project root.


TESTING
-------

  sh tests/run_tests.sh              fast suite (static + unit + cli)
  sh tests/run_tests.sh all          all suites
  sh tests/run_tests.sh docker       gateway tests in Docker container

See TESTING.md for details.


ADDING TESTS
------------

  C unit test for tinytd:  tests/tinytd/test_*.c  (auto-discovered)
  C unit test for CLI:     tests/cli/test_*.c
  Python gateway test:     tests/gateway/test_*.py  (use gateway fixture)
  Shell test:              tests/tinytd/test_*.sh or tests/cli/test_*.sh


PROTOCOL
--------

Binary protocol is defined in common/proto/v1.h and common/proto/v2.h.

To add a new packet type:

  1. Add PKT_* constant to v2.h
  2. Add payload struct
  3. Handle in gateway/src/session.c
  4. Add test in tests/gateway/test_ws.py


RELEASE
-------

Version is set in configure.ac:

  AC_INIT([tinytrack], [X.Y.Z], ...)

Update the version badge in server/README.md as well.


CLEANING
--------

  sh scripts/clean.sh
