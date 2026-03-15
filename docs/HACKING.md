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

    make distcheck

This verifies the distribution is complete and builds correctly.
