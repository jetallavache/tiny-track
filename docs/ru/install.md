# Установка

## Быстрая установка (рекомендуется)

Самый простой способ установить TinyTrack на любой поддерживаемый Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/jetallavache/tinytrack/main/install.sh | bash
```

Скрипт автоматически:
1. Определит дистрибутив (Debian/Ubuntu, Fedora/RHEL, Arch)
2. Установит зависимости для сборки
3. Клонирует репозиторий и соберёт из исходников
4. Установит бинарники в `/usr/local/bin`
5. Включит и запустит systemd-сервисы `tinytd` и `tinytrack`

### Установка через Docker (без сборки)

```bash
curl -fsSL https://raw.githubusercontent.com/jetallavache/tinytrack/main/install.sh | TINYTRACK_DOCKER=1 bash
```

Скачивает готовый образ с Docker Hub и создаёт `tinytrack-compose.yml` в текущей директории.

### Параметры

| Переменная | По умолчанию | Описание |
|---|---|---|
| `TINYTRACK_VERSION` | `main` | Ветка или тег git для установки |
| `TINYTRACK_PREFIX` | `/usr/local` | Префикс установки |
| `TINYTRACK_NO_SERVICE` | `0` | `1` — пропустить настройку systemd |
| `TINYTRACK_DOCKER` | `0` | `1` — установить через Docker |

```bash
# Установить конкретный релиз
curl -fsSL https://raw.githubusercontent.com/jetallavache/tinytrack/main/install.sh | \
  TINYTRACK_VERSION=v0.1.6 bash

# Установить без запуска сервисов
curl -fsSL https://raw.githubusercontent.com/jetallavache/tinytrack/main/install.sh | \
  TINYTRACK_NO_SERVICE=1 bash

# Установить в нестандартный префикс
curl -fsSL https://raw.githubusercontent.com/jetallavache/tinytrack/main/install.sh | \
  TINYTRACK_PREFIX=/opt/tinytrack bash
```

---

## Ручная установка

### Требования

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

# Fedora/RHEL
sudo dnf install gcc make autoconf automake libtool openssl-devel ncurses-devel

# Arch
sudo pacman -S gcc make autoconf automake libtool pkg-config openssl ncurses

# openSUSE
sudo zypper install gcc make autoconf automake libtool libopenssl-devel ncurses-devel
```

### Сборка и установка

```bash
git clone https://github.com/jetallavache/tinytrack.git
cd tinytrack/server
./bootstrap.sh && ./configure && make
sudo make install

# После установки сервисы автоматически запускаются
```

### Доступ для пользователя

```bash
sudo usermod -aG tinytd $USER
newgrp tinytd   # применить без перелогина
```

### Удаление

```bash
sudo systemctl stop tinytd tinytrack
sudo make uninstall
```
