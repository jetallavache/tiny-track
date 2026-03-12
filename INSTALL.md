# Installation Instructions

## Prerequisites

* Linux kernel 2.6.27 or later
* GCC with C11 support
* GNU Make
* autoconf, automake, libtool (for building from git)
* librt (usually part of glibc)
* libcrypto (OpenSSL) - optional, for gateway

## Building from Source

### From Release Tarball

```
tar xzf tinytrack-0.1.0.tar.gz
cd tinytrack-0.1.0
./configure
make
sudo make install
```

### From Git Repository

```
git clone https://github.com/example/tiny-track.git
cd tiny-track
./bootstrap.sh
./configure
make
sudo make install
```

## Configuration Options

```
./configure --help
```

Common options:

* --prefix=PREFIX         Install to PREFIX (default: /usr/local)
* --enable-debug          Enable debug mode (disables optimization)

## Installation Paths

By default, files are installed to:

* Binaries: /usr/local/bin/
* Configuration: /etc/tinytrack/
* Data: /var/lib/tinytrack/

## Post-Installation

Create data directory:

```
sudo mkdir -p /var/lib/tinytrack
sudo chmod 755 /var/lib/tinytrack
```

Install systemd service (optional):

```
sudo cp etc/systemd/tinytd.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable tinytd
sudo systemctl start tinytd
```

## Verification

Check installation:

```
tinytd --version
tiny-cli --version
```

Test daemon:

```
tinytd &
sleep 2
tiny-cli status
pkill tinytd
```

## Uninstallation

```
sudo make uninstall
```
