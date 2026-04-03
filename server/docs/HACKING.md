Developer Guide
===============

Autotools Structure
-------------------

configure.ac        - Main autoconf configuration
Makefile.am         - Top-level automake file
*/Makefile.am       - Per-directory build rules

Bootstrap Process
-----------------

After cloning from git:

    ./bootstrap.sh

This generates:
- configure script
- Makefile.in templates
- config.h.in

Then run normal build:

    ./configure
    make

Code Formatting
---------------

Format all code:

    make format

Check formatting without changes:

    make format-check

Configuration is in .clang-format file.

Adding New Files
----------------

1. Add source to appropriate Makefile.am:
   - common/Makefile.am for shared code
   - tinytd/Makefile.am for daemon
   - cli/Makefile.am for CLI
   - gateway/Makefile.am for gateway

2. Regenerate:

    autoreconf -fi

Adding Dependencies
-------------------

Edit configure.ac:

    AC_CHECK_LIB([name], [function])
    AC_CHECK_HEADERS([header.h])

Then regenerate and reconfigure.

Testing Changes
---------------

Fast suite (static analysis + unit + integration):

    sh tests/run_tests.sh

Full suite including gateway:

    sh tests/run_tests.sh all

See docs/TESTING.md for details on individual test suites.

Test Configuration
------------------

All tests use a single shared config: tests/tinytrack.conf-test

It contains sections for all components (tinytd, gateway) with
paths under /tmp/ and debug settings suitable for test environments.

Cleaning
--------

Remove all build and test artifacts:

    sh scripts/clean.sh

Verify distribution:

    make distcheck
