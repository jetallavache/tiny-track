# Installation

## Requirements

| Инструмент | Версия | Назначение |
|------------|--------|------------|
| gcc | ≥ 9 | C11 compiler |
| make | any | build |
| autoconf / automake | ≥ 2.69 / 1.15 | autotools |
| libssl-dev | any | TLS |
| libncurses-dev | any | ncurses dashboard |

```bash
# Ubuntu/Debian
sudo apt install gcc make autoconf automake libtool libssl-dev libncurses-dev

# openSUSE
sudo zypper install gcc make autoconf automake libtool libopenssl-devel ncurses-devel

# Fedora/RHEL
sudo dnf install gcc make autoconf automake libtool openssl-devel ncurses-devel
```

## Build & Install

```bash
git clone <repo> && cd tiny-track/server
./bootstrap.sh && ./configure && make
sudo make install
```

## Start

```bash
sudo systemctl enable tinytd tinytrack
sudo systemctl start tinytd tinytrack
systemctl status tinytd tinytrack
```

## User Access

```bash
sudo usermod -aG tinytd $USER
newgrp tinytd   # apply without re-login
```

## Uninstall

```bash
sudo systemctl stop tinytd tinytrack
sudo make uninstall
```
