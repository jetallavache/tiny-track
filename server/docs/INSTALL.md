Installation Instructions
=========================

Prerequisites
-------------

* Linux kernel 2.6.27 or later
* GCC with C11 support
* GNU Make
* autoconf, automake, libtool (for building from git)
* librt (usually part of glibc)
* OpenSSL (libssl-dev / openssl-devel) - required for gateway TLS support

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
* Configuration:  /etc/tinytrack/
* Data:           /var/lib/tinytrack/

Post-Installation
-----------------

`sudo make install` handles all of the following automatically.
The commands below are provided for reference or manual setup.

Create system users and groups (required for privilege dropping):

    sudo groupadd --system tinytd
    sudo useradd --system --no-create-home --shell /usr/sbin/nologin --gid tinytd tinytd

    sudo groupadd --system tinytrack
    sudo useradd --system --no-create-home --shell /usr/sbin/nologin --gid tinytrack tinytrack

Create data directory and set ownership:

    sudo mkdir -p /var/lib/tinytrack
    sudo chown tinytd:tinytd /var/lib/tinytrack
    sudo chmod 750 /var/lib/tinytrack

Install systemd services (optional):

    sudo cp etc/systemd/tinytd.service    /etc/systemd/system/
    sudo cp etc/systemd/tinytrack.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable tinytd tinytrack
    sudo systemctl start  tinytd tinytrack

Verification
------------

Check installation:

    tiny-cli --version

Test daemon (foreground):

    tinytd --no-daemon --config /etc/tinytrack/tinytrack.conf &
    sleep 2
    tiny-cli status
    pkill tinytd

Uninstallation
--------------

`sudo make uninstall` removes everything automatically:
stops the daemons, deletes runtime files, data directory,
and the system users and groups.

To uninstall manually:

    pkill -x tinytd tinytrack
    sudo userdel tinytd
    sudo groupdel tinytd
    sudo userdel tinytrack
    sudo groupdel tinytrack
    sudo rm -f /var/run/tinytd.pid /var/run/tinytrack.pid
    sudo rm -f /dev/shm/tinytd-live.dat
    sudo rm -rf /var/lib/tinytrack
    sudo make uninstall
