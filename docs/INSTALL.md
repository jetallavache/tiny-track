Installation Instructions
=========================

Prerequisites
-------------

* Linux kernel 2.6.27 or later
* GCC with C11 support
* GNU Make
* autoconf, automake, libtool (for building from git)
* librt (usually part of glibc)
* libcrypto (OpenSSL) - optional, for gateway

Building from Source
--------------------

From release tarball:

    tar xzf tinytrack-0.1.0.tar.gz
    cd tinytrack-0.1.0
    ./configure
    make
    sudo make install

From git repository:

    git clone https://github.com/jetallavache/tiny-track.git
    cd tiny-track
    ./bootstrap.sh
    ./configure
    make
    sudo make install

Configuration Options
---------------------

    ./configure --help

Common options:

* --prefix=PREFIX         Install to PREFIX (default: /usr/local)
* --enable-debug          Enable debug mode (disables optimization)

Installation Paths
------------------

Default installation (prefix=/usr/local):

* Binaries:       /usr/local/bin/
* Configuration:  /etc/
* Data:           /var/lib/tinytrack/

Post-Installation
-----------------

Create system user and group (required for privilege dropping):

    sudo groupadd --system tinytd
    sudo useradd --system --no-create-home --shell /usr/sbin/nologin --gid tinytd tinytd

Create data directory and set ownership:

    sudo mkdir -p /var/lib/tinytrack
    sudo chown tinytd:tinytd /var/lib/tinytrack
    sudo chmod 750 /var/lib/tinytrack

Install systemd service (optional):

    [sudo cp etc/systemd/tinytd.service /etc/systemd/system/]
    sudo systemctl daemon-reload
    sudo systemctl enable tinytd
    sudo systemctl start tinytd

Verification
------------

Check installation:

    tinytd --version
    tiny-cli --version

Test daemon:

    tinytd &
    sleep 2
    tiny-cli status
    pkill tinytd

Uninstallation
--------------

    sudo make uninstall
