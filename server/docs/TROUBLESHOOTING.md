# Устранение неполадок

## Диагностика

### Быстрая проверка

```bash
# Статус демонов
systemctl status tinytd tinytrack

# Логи (systemd)
journalctl -u tinytd -u tinytrack -n 50 --no-pager

# Логи (foreground / Docker)
docker compose logs -f

# Проверить что live-файл создан
ls -lh /dev/shm/tinytd-live.dat

# Проверить что порт слушается
ss -tlnp | grep 25015

# Статус через CLI
tiny-cli status
```

---

## Частые ошибки

### `Failed to open mmap: /dev/shm/tinytd-live.dat`

**Причина:** tinytrack запустился раньше tinytd, live-файл ещё не создан.

**Решение:**
```bash
# Убедиться что tinytd запущен первым
systemctl start tinytd
sleep 2
systemctl start tinytrack

# В Docker — entrypoint ждёт появления файла автоматически
```

---

### `tinytd did not create live file` (в тестах)

**Причина:** демон упал при старте.

**Диагностика:**
```bash
./tinytd/tinytd --no-daemon -c tests/tinytrack.conf-test
# Смотреть вывод на ошибки
```

---

### `Cannot open config file`

**Причина:** конфиг не найден по пути по умолчанию `/etc/tinytrack/tinytrack.conf`.

**Решение:**
```bash
tinytd -c /path/to/tinytrack.conf
# или
export TINYTRACK_CONF=/path/to/tinytrack.conf
```

---

### `Failed to write pid file: /var/run/tinytd.pid`

**Причина:** нет прав на запись в `/var/run/`.

**Решение:** запустить от root или изменить `pid_file` в конфиге:
```ini
[tinytd]
pid_file = /tmp/tinytd.pid
```

---

### `setuid failed` / `setgid failed`

**Причина:** пользователь/группа `tinytd` не существует.

**Решение:**
```bash
sudo groupadd --system tinytd
sudo useradd --system --no-create-home --shell /usr/sbin/nologin --gid tinytd tinytd
```

---

### `libncurses.so.6: cannot open shared object file`

**Причина:** в Docker-образе не установлен `libncurses6`.

**Решение:** пересобрать образ (уже исправлено в Dockerfile):
```bash
docker compose build --no-cache
```

---

### Порт занят

```bash
ss -tlnp | grep 25015
# Найти и завершить процесс
fuser -k 25015/tcp
```

---

### Зомби-процессы после тестов

```bash
pkill -f "tinytd|tinytrack"
rm -f /tmp/tinytd-test*.dat /tmp/tinytd-test.pid /tmp/tinytrack-test.pid
```

---

### WebSocket: `Connection reset by peer`

**Причина:** tinytrack принял TCP-соединение, но ещё не готов (live-файл не открыт).

**Решение:** подождать 1-2 секунды после старта контейнера или увеличить retry в клиенте.

---

### TLS: `SSL handshake failed`

**Диагностика:**
```bash
openssl s_client -connect localhost:25015 -brief
```

**Частые причины:**
- Неверный путь к сертификату/ключу
- Сертификат истёк: `openssl x509 -in server.crt -noout -dates`
- `listen` не начинается с `wss://`

---

### Метрики не обновляются

```bash
# Проверить что tinytd пишет в буфер
tiny-cli status
# Поле "last_ts" должно обновляться

# Проверить интервал
grep interval_ms /etc/tinytrack/tinytrack.conf
```

---

## Отладочный режим

Запуск в foreground с debug-логами:

```bash
# Хост
./tinytd/tinytd --no-daemon -c etc/tinytrack.conf-debug
./gateway/tinytrack --no-daemon -c etc/tinytrack.conf-debug

# Docker
docker run --rm -it \
  -v /proc:/host/proc:ro -v /:/host/rootfs:ro -v /dev/shm:/dev/shm \
  -p 25015:25015 \
  -e TT_LOG_LEVEL=debug \
  -e TT_LOG_BACKEND=docker \
  tinytrack
```

---

## Проверка данных

```bash
# Проверить что метрики в разумных диапазонах
tiny-cli metrics

# Проверить историю
tiny-cli history l1

# Проверить системную информацию
# (через WebSocket клиент, команда CMD_GET_SYS_INFO=0x11)
```

---

## Сбор информации для баг-репорта

```bash
echo "=== Version ===" && tinytd --version 2>/dev/null || echo "n/a"
echo "=== OS ===" && uname -a
echo "=== Config ===" && cat /etc/tinytrack/tinytrack.conf
echo "=== Status ===" && tiny-cli status 2>&1
echo "=== Logs (last 50) ===" && journalctl -u tinytd -u tinytrack -n 50 --no-pager 2>/dev/null
```
