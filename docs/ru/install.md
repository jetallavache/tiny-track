# Установка

## Требования

| Инструмент | Версия | Назначение |
|------------|--------|------------|
| gcc | ≥ 9 | C11 компилятор |
| make | любая | сборка |
| autoconf / automake | ≥ 2.69 / 1.15 | autotools |
| libssl-dev | любая | TLS |
| libncurses-dev | любая | ncurses dashboard |

```bash
# Ubuntu/Debian
sudo apt install gcc make autoconf automake libtool libssl-dev libncurses-dev

# openSUSE
sudo zypper install gcc make autoconf automake libtool libopenssl-devel ncurses-devel

# Fedora/RHEL
sudo dnf install gcc make autoconf automake libtool openssl-devel ncurses-devel
```

## Сборка и установка

```bash
git clone <repo> && cd tiny-track/server
./bootstrap.sh && ./configure && make
sudo make install
```

## Запуск

```bash
sudo systemctl enable tinytd tinytrack
sudo systemctl start tinytd tinytrack
systemctl status tinytd tinytrack
```

## Доступ для пользователя

```bash
sudo usermod -aG tinytd $USER
newgrp tinytd   # применить без перелогина
```

## Удаление

```bash
sudo systemctl stop tinytd tinytrack
sudo make uninstall
```
