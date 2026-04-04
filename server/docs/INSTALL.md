# Установка TinyTrack на хост

## Требования

- Linux (kernel ≥ 4.x)
- gcc ≥ 9, make, autoconf, automake
- libssl-dev, libncurses-dev
- systemd (опционально, для автозапуска)

## Сборка и установка

```bash
# 1. Клонировать и собрать
git clone <repo> tinytrack && cd tinytrack/server
./bootstrap.sh && ./configure && make

# 2. Установить (требует root)
sudo make install
```

Что устанавливается:
- `/usr/local/bin/tinytd` — демон сбора метрик
- `/usr/local/bin/tinytrack` — gateway
- `/usr/local/bin/tiny-cli` — CLI клиент
- `/etc/tinytrack/tinytrack.conf` — конфиг
- `/etc/systemd/system/tinytd.service`
- `/etc/systemd/system/tinytrack.service`

## Системные пользователи

`make install` автоматически создаёт:

```bash
groupadd --system tinytd
useradd --system --no-create-home --shell /usr/sbin/nologin --gid tinytd tinytd

groupadd --system tinytrack
useradd --system --no-create-home --shell /usr/sbin/nologin --gid tinytrack tinytrack
```

Директория данных: `/var/lib/tinytrack/` (владелец `tinytd:tinytd`).

## Запуск

```bash
sudo systemctl enable tinytd tinytrack
sudo systemctl start tinytd tinytrack

# Проверить статус
systemctl status tinytd tinytrack
```

## Доступ для пользователя

Чтобы использовать `tiny-cli` без root:

```bash
sudo usermod -aG tinytd $USER
newgrp tinytd  # применить без перелогина
```

## Конфигурация

Отредактируйте `/etc/tinytrack/tinytrack.conf` и перезапустите:

```bash
sudo systemctl restart tinytd tinytrack
```

Подробнее: [CONFIGURATION.md](CONFIGURATION.md)

## Удаление

```bash
sudo systemctl stop tinytd tinytrack
sudo make uninstall
```
