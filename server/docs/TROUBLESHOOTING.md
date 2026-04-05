TROUBLESHOOTING
===============

QUICK DIAGNOSTICS
-----------------

  systemctl status tinytd tinytrack
  journalctl -u tinytd -u tinytrack -n 50 --no-pager
  ls -lh /dev/shm/tinytd-live.dat
  ss -tlnp | grep 25015
  tiny-cli status


COMMON ERRORS
-------------

"Failed to open mmap: /dev/shm/tinytd-live.dat"

  tinytrack started before tinytd created the live file.
  Start tinytd first and wait 1-2 seconds before tinytrack.
  In Docker the entrypoint handles this automatically.

"Cannot open config file"

  Config not found at /etc/tinytrack/tinytrack.conf.
  Pass explicitly: tinytd -c /path/to/tinytrack.conf

"Failed to write pid file: /var/run/tinytd.pid"

  No write permission to /var/run/.
  Change pid_file in config: pid_file = /tmp/tinytd.pid

"setuid failed" / "setgid failed"

  User or group does not exist.
  Create them:
    groupadd --system tinytd
    useradd --system --no-create-home --shell /usr/sbin/nologin \
        --gid tinytd tinytd

"libncurses.so.6: cannot open shared object file"

  libncurses6 not installed in Docker runtime image.
  Rebuild: docker compose build --no-cache

Port already in use:

  ss -tlnp | grep 25015
  fuser -k 25015/tcp

Stale processes after tests:

  pkill -f "tinytd|tinytrack"
  rm -f /tmp/tinytd-test*.dat /tmp/tinytd-test.pid /tmp/tinytrack-test.pid

"Connection reset by peer" (WebSocket)

  tinytrack accepted TCP but live file not yet open.
  Wait 1-2 seconds after container start.

TLS handshake failed:

  openssl s_client -connect localhost:25015 -brief
  Check: cert path, key path, cert expiry, listen starts with wss://

Metrics not updating:

  tiny-cli status   (check last_ts field)
  grep interval_ms /etc/tinytrack/tinytrack.conf


DEBUG MODE
----------

Run in foreground with debug logging:

  ./tinytd/tinytd --no-daemon -c etc/tinytrack.conf-debug
  ./gateway/tinytrack --no-daemon -c etc/tinytrack.conf-debug

In Docker:

  docker run --rm -it \
    -v /proc:/host/proc:ro -v /:/host/rootfs:ro -v /dev/shm:/dev/shm \
    -p 25015:25015 \
    -e TT_LOG_LEVEL=debug \
    tinytrack


BUG REPORT
----------

Collect the following:

  uname -a
  cat /etc/tinytrack/tinytrack.conf
  tiny-cli status
  journalctl -u tinytd -u tinytrack -n 100 --no-pager
