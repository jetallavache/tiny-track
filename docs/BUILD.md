Building TinyTrack from Source
==============================

Prerequisites
-------------

Required:
- GCC with C11 support
- GNU Make
- Autotools (autoconf, automake, libtool)
- librt (usually part of glibc)
- OpenSSL (libssl-dev / openssl-devel) - for gateway TLS support

Optional:
- systemd - for service unit installation
- cppcheck - for static analysis
- valgrind - for memory checks
- python3 + pytest - for gateway tests
- node + npm - for JS integration tests

Quick Build
-----------

From release tarball:

    ./configure
    make
    sudo make install

From git repository:

    ./bootstrap.sh
    ./configure
    make
    sudo make install

Configuration Options
---------------------

--prefix=PREFIX         Install to PREFIX [/usr/local]
--enable-debug          Enable debug mode (no optimization)
--with-systemdsystemunitdir=DIR
                        Install systemd service to DIR

Examples:

    ./configure --prefix=/usr
    ./configure --enable-debug
    ./configure --with-systemdsystemunitdir=/lib/systemd/system

Build Targets
-------------

make                    Build all binaries
make clean              Remove build artifacts
make install            Install to system
make uninstall          Remove from system
make dist               Create release tarball
make distcheck          Verify release tarball

Developer Targets
-----------------

Code formatting (requires clang-format):

    make format             Format all C sources in-place
    make format-check       Check formatting without modifying files

Gateway integration tests (requires node + built binaries):

    make check-gateway              Run basic WebSocket protocol tests
    make check-gateway-extended     Run extended integration tests

    # Custom port:
    make check-gateway-extended GATEWAY_TEST_PORT=4099

Valgrind memory checks (requires valgrind + built binaries):

    make valgrind-tinytd    Run tinytd for 5s, report leaks and errors
    make valgrind-cli       Run tiny-cli status under valgrind
    make valgrind-gateway   Run tinytrack under valgrind with a live WS client

    Reports are written to valgrind-tinytd.log, valgrind-tiny-cli.log,
    valgrind-tinytrack.log in the project root.

Coverage (requires ./configure --enable-coverage):

    ./configure --enable-coverage
    make
    make coverage           Collect and display coverage data
    make coverage-clean     Remove .gcda/.gcno files and coverage-report/

Cleaning:

    sh scripts/clean.sh     Full clean: distclean + autotools files +
                            coverage artifacts + valgrind logs +
                            test runtime files + Python/Node caches

Installation Layout
-------------------

Default installation (prefix=/usr/local):

    /usr/local/bin/tinytd           - Monitoring daemon
    /usr/local/bin/tiny-cli         - CLI client
    /usr/local/bin/tinytrack        - HTTP/WebSocket gateway
    /usr/local/etc/tinytrack/tinytrack.conf  - Configuration file
    /usr/local/share/doc/tinytrack/ - Documentation

With systemd:

    /lib/systemd/system/tinytd.service    - tinytd service unit
    /lib/systemd/system/tinytrack.service - tinytrack service unit

Development
-----------

Bootstrap from git:

    ./bootstrap.sh

This runs autoreconf to generate configure script and Makefiles.

Troubleshooting
---------------

If configure fails with "librt not found":
    Install glibc development package (glibc-devel or libc6-dev)

If gateway build fails with OpenSSL errors:
    Install OpenSSL development package (openssl-devel or libssl-dev)

If systemd unit is not installed:
    Use --with-systemdsystemunitdir=/lib/systemd/system
