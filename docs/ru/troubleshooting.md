# Устранение неполадок

## Быстрая диагностика

```bash
systemctl status tinytd tinytrack
journalctl -u tinytd -u tinytrack -n 50 --no-pager
ls -lh /dev/shm/tinytd-live.dat
ss -tlnp | grep 25015
tiny-cli status
```

## Частые ошибки

### `Failed to open mmap: /dev/shm/tinytd-live.dat`

> [!WARNING]
> tinytrack запустился раньше tinytd. Live-файл ещё не создан.

```bash
systemctl start tinytd && sleep 2 && systemctl start tinytrack
```

В Docker entrypoint ждёт появления файла автоматически.

---

### `setuid failed` / `setgid failed`

> [!WARNING]
> Пользователь или группа не существует.

```bash
sudo groupadd --system tinytd
sudo useradd --system --no-create-home --shell /usr/sbin/nologin --gid tinytd tinytd
```

---

### `libncurses.so.6: cannot open shared object file`

> [!WARNING]
> В Docker-образе не установлен `libncurses6`.

```bash
docker compose build --no-cache
```

---

### Порт занят

```bash
ss -tlnp | grep 25015
fuser -k 25015/tcp
```

---

### TLS handshake failed

```bash
openssl s_client -connect localhost:25015 -brief
openssl x509 -in server.crt -noout -dates   # проверить срок
```

Убедитесь что `listen` начинается с `wss://`.

---

### Зомби-процессы после тестов

```bash
pkill -f "tinytd|tinytrack"
rm -f /tmp/tinytd-test*.dat /tmp/tinytd-test.pid /tmp/tinytrack-test.pid
```

## Отладочный режим

```bash
# Хост
./tinytd/tinytd --no-daemon -c etc/tinytrack.conf-debug
./gateway/tinytrack --no-daemon -c etc/tinytrack.conf-debug

# Docker
docker run --rm -it \
  -v /proc:/host/proc:ro -v /:/host/rootfs:ro -v /dev/shm:/dev/shm \
  -p 25015:25015 -e TT_LOG_LEVEL=debug \
  tinytrack
```

## Сбор информации для баг-репорта

```bash
uname -a
cat /etc/tinytrack/tinytrack.conf
tiny-cli status
journalctl -u tinytd -u tinytrack -n 100 --no-pager
```
