OVERVIEW
========

TinyTrack is a minimal system metrics daemon for Linux with real-time
streaming over WebSocket. It is designed for resource-constrained
environments (1 GB RAM, 1 CPU core) and requires no runtime dependencies
beyond libc and libssl.


COMPONENTS
----------

  tinytd      metrics collector daemon
              reads /proc and /sys, writes to ring buffer in shared memory

  tinytrack   WebSocket/HTTP gateway
              reads ring buffer via mmap, streams metrics to clients

  tiny-cli    command-line client
              reads ring buffer directly (no network), ncurses dashboard


METRICS COLLECTED
-----------------

  CPU usage       /proc/stat              total across all cores, %
  Memory usage    /proc/meminfo           (total - available) / total, %
  Network RX/TX   /proc/net/dev           all interfaces except lo, bytes/s
  Disk usage      statvfs(rootfs_path)    root filesystem, %
  Load average    /proc/loadavg           1 / 5 / 15 minutes


RING BUFFER
-----------

Metrics are stored in three rings with different resolution:

  L1   1 second resolution    3600 samples   ~1 hour
  L2   1 minute resolution    1440 samples   ~24 hours  (aggregated from L1)
  L3   1 hour resolution       720 samples   ~30 days   (aggregated from L2)

The buffer lives in /dev/shm (tmpfs) for zero-copy mmap access.
It is periodically synced to a shadow file on disk for recovery after restart.


GATEWAY ENDPOINTS
-----------------

  ws://host:25015/websocket        WebSocket (binary protocol v1/v2)
  wss://host:25015/websocket       WebSocket over TLS
  GET http://host:25015/api/metrics/live   HTTP snapshot (JSON)

On connect the server sends PKT_CONFIG then starts pushing PKT_METRICS
every interval_ms milliseconds.


DOCKER
------

TinyTrack can monitor the *host* system from inside a container by
bind-mounting the host's /proc and /:

  docker run -d \
    -v /proc:/host/proc:ro \
    -v /:/host/rootfs:ro   \
    -v /dev/shm:/dev/shm   \
    -p 25015:25015         \
    -e TT_PROC_ROOT=/host/proc \
    -e TT_ROOTFS_PATH=/host/rootfs \
    tinytrack

See DOCKER.md for full instructions.


TINY-CLI COMMANDS
-----------------

  tiny-cli status          daemon and ring buffer status
  tiny-cli metrics         live metrics (refreshes every second)
  tiny-cli history l1      last hour  (L1 ring)
  tiny-cli history l2      last 24h   (L2 ring)
  tiny-cli history l3      last 7d    (L3 ring)
  tiny-cli dashboard       interactive ncurses dashboard
