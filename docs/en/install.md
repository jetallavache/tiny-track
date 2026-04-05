# Installation

## Quick Install (recommended)

The fastest way to install TinyTrack on any supported Linux system:

```bash
curl -fsSL https://raw.githubusercontent.com/jetallavache/tiny-track/main/install.sh | bash
```

The script will:
1. Detect your OS (Debian/Ubuntu, Fedora/RHEL, Arch)
2. Install build dependencies automatically
3. Clone the repository and build from source
4. Install binaries to `/usr/local/bin`
5. Enable and start `tinytd` and `tinytrack` systemd services

### Install via Docker (no build required)

```bash
curl -fsSL https://raw.githubusercontent.com/jetallavache/tiny-track/main/install.sh | TINYTRACK_DOCKER=1 bash
```

This pulls the pre-built image from Docker Hub and creates a `tinytrack-compose.yml` in the current directory.

### Options

| Variable | Default | Description |
|---|---|---|
| `TINYTRACK_VERSION` | `main` | Git branch or tag to install |
| `TINYTRACK_PREFIX` | `/usr/local` | Install prefix |
| `TINYTRACK_NO_SERVICE` | `0` | Set to `1` to skip systemd setup |
| `TINYTRACK_DOCKER` | `0` | Set to `1` to install via Docker |

```bash
# Install a specific release
curl -fsSL https://raw.githubusercontent.com/jetallavache/tiny-track/main/install.sh | \
  TINYTRACK_VERSION=v0.1.6 bash

# Install without starting services
curl -fsSL https://raw.githubusercontent.com/jetallavache/tiny-track/main/install.sh | \
  TINYTRACK_NO_SERVICE=1 bash

# Install to custom prefix
curl -fsSL https://raw.githubusercontent.com/jetallavache/tiny-track/main/install.sh | \
  TINYTRACK_PREFIX=/opt/tinytrack bash
```

---

## Manual Installation

### Requirements

| Tool | Version | Purpose |
|------|---------|---------|
| gcc | ≥ 9 | C11 compiler |
| make | any | build |
| autoconf / automake | ≥ 2.69 / 1.15 | autotools |
| libssl-dev | any | TLS |
| libncurses-dev | any | ncurses dashboard |

```bash
# Ubuntu/Debian
sudo apt install gcc make autoconf automake libtool libssl-dev libncurses-dev

# Fedora/RHEL
sudo dnf install gcc make autoconf automake libtool openssl-devel ncurses-devel

# Arch
sudo pacman -S gcc make autoconf automake libtool pkg-config openssl ncurses

# openSUSE
sudo zypper install gcc make autoconf automake libtool libopenssl-devel ncurses-devel
```

### Build & Install

```bash
git clone https://github.com/jetallavache/tiny-track.git
cd tiny-track/server
./bootstrap.sh && ./configure && make
sudo make install
```

### Start

```bash
sudo systemctl enable tinytd tinytrack
sudo systemctl start tinytd tinytrack
systemctl status tinytd tinytrack
```

### User Access

```bash
sudo usermod -aG tinytd $USER
newgrp tinytd   # apply without re-login
```

### Uninstall

```bash
sudo systemctl stop tinytd tinytrack
sudo make uninstall
```
