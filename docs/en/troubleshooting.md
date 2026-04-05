# Troubleshooting

## Quick Diagnostics

```bash
systemctl status tinytd tinytrack
journalctl -u tinytd -u tinytrack -n 50 --no-pager
ls -lh /dev/shm/tinytd-live.dat
ss -tlnp | grep 25015
tiny-cli status
```

## Common Errors

### `Failed to open mmap: /dev/shm/tinytd-live.dat`

> [!WARNING]
> tinytrack started before tinytd. Live file not yet created.

```bash
systemctl start tinytd && sleep 2 && systemctl start tinytrack
```

In Docker the entrypoint waits for the file automatically.

---

### `setuid failed` / `setgid failed`

> [!WARNING]
> User or group does not exist.

```bash
sudo groupadd --system tinytd
sudo useradd --system --no-create-home --shell /usr/sbin/nologin --gid tinytd tinytd
```

---

### `libncurses.so.6: cannot open shared object file`

> [!WARNING]
> Not installed in Docker runtime image `libncurses6`.

```bash
docker compose build --no-cache
```

---

### Port in use

```bash
ss -tlnp | grep 25015
fuser -k 25015/tcp
```

---

### TLS handshake failed

```bash
openssl s_client -connect localhost:25015 -brief
openssl x509 -in server.crt -noout -dates   # check expiry
```

Make sure `listen` starts with `wss://`.

---

### Stale processes after tests

```bash
pkill -f "tinytd|tinytrack"
rm -f /tmp/tinytd-test*.dat /tmp/tinytd-test.pid /tmp/tinytrack-test.pid
```

## Debug Mode

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

## Bug Report

```bash
uname -a
cat /etc/tinytrack/tinytrack.conf
tiny-cli status
journalctl -u tinytd -u tinytrack -n 100 --no-pager
```
