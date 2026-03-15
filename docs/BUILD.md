Building TinyTrack from Source
==============================

Prerequisites
-------------

Required:
- GCC with C11 support
- GNU Make
- Autotools (autoconf, automake, libtool)
- librt (usually part of glibc)

Optional:
- libcrypto (OpenSSL) - for gateway WebSocket support
- systemd - for service unit installation

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

Installation Layout
-------------------

Default installation (prefix=/usr/local):

    /usr/local/bin/tinytd           - Monitoring daemon
    /usr/local/bin/tiny-cli         - CLI client
    /usr/local/bin/tinytrack        - HTTP/WebSocket gateway
    /usr/local/etc/tinytrack.conf   - Configuration file
    /usr/local/share/doc/tinytrack/ - Documentation

With systemd:

    /lib/systemd/system/tinytd.service - Systemd unit

Development
-----------

Bootstrap from git:

    ./bootstrap.sh

This runs autoreconf to generate configure script and Makefiles.

Troubleshooting
---------------

If configure fails with "librt not found":
    Install glibc development package (glibc-devel or libc6-dev)

If gateway build fails:
    Install OpenSSL development package (openssl-devel or libssl-dev)

If systemd unit is not installed:
    Use --with-systemdsystemunitdir=/lib/systemd/system
