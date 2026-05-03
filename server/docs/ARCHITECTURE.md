ARCHITECTURE
============

OVERVIEW
--------

TinyTrack consists of three binaries communicating via shared memory:

  tinytd      reads /proc and /sys, writes metrics to ring buffer in /dev/shm
  tinytrack   reads ring buffer via mmap, streams to WebSocket clients
  tiny-cli    reads ring buffer via mmap, displays in terminal

Data flow:

  /proc/stat          \
  /proc/meminfo        |
  /proc/net/dev        +--> tinytd --[mmap write]--> /dev/shm/tinytd-live.dat
  /proc/loadavg        |                                    |
  statvfs(rootfs)     /                                     |
                                              +-------------+
                                              |
                                              +--[mmap read]--> tinytrack --> WebSocket clients
                                              +--[mmap read]--> tiny-cli


TINYTD
------

Metrics collector daemon.  Runs as a systemd service or in foreground
with --no-daemon.

Startup sequence:

  1. Load config, initialize sysfs paths (proc_root, rootfs_path)
  2. Create or recover live file in /dev/shm
  3. Drop privileges to tinytd:tinytd
  4. Start epoll loop with timerfd at interval_ms
  5. Each tick: read /proc/* -> write tt_metrics to L1 -> aggregate to L2/L3

The shadow file (/var/lib/tinytrack/tinytd-shadow.dat) is a persistent
copy of the ring buffer, synced every shadow_sync_interval_sec seconds.
On startup, if auto_recover=true, the live buffer is restored from shadow.


TINYTRACK
---------

WebSocket/HTTP gateway.  Single-threaded, event-driven with epoll
(edge-triggered).

  - Reads live file via mmap (zero-copy)
  - Pushes PKT_METRICS to all connected clients every update_interval ms
  - Handles CMD_* commands from clients
  - Optional TLS via OpenSSL
  - HTTP endpoint GET /api/metrics/live returns JSON snapshot


TINY-CLI
--------

Command-line client.  Reads live file directly via mmap, no network.

  tiny-cli status      daemon and ring buffer status
  tiny-cli metrics     live metrics, refreshes every second
  tiny-cli history l1  last hour  (L1 ring)
  tiny-cli history l2  last 24h   (L2 ring)
  tiny-cli history l3  last 30d   (L3 ring)
  tiny-cli dashboard   interactive ncurses dashboard


SHARED MEMORY LAYOUT
--------------------

File: /dev/shm/tinytd-live.dat

  Offset   Size    Content
  ------   ----    -------
  0        256     ttr_header
             magic (4), version (4), checksum (4),
             last_update_ts (8), last_shadow_sync_ts (8),
             writer_pid (4), num_consumers (4),
             interval_ms (4), l2_agg_interval_ms (4), l3_agg_interval_ms (4),
             padding (204)
  256      2048    ttr_consumer_table (32 x 64-byte slots)
  2304     64      L1 ttr_meta
             seq (4), head (4), tail (4), capacity (4), cell_size (4),
             first_ts (8), last_ts (8), flags (4), padding (20)
  2368     ~225KB  L1 data  (3600 x sizeof(tt_metrics))
  ...      64      L2 ttr_meta
  ...      ~90KB   L2 data  (1440 x sizeof(tt_metrics))
  ...      64      L3 ttr_meta
  ...      ~45KB   L3 data  (720 x sizeof(tt_metrics))

Total: ~360 KB with default capacities.

Seqlock (ttr_meta.seq) protects each ring level from writer/reader races
without mutexes.  Reader retries if seq changes during read.


PROTOCOL
--------

Binary protocol over WebSocket.  All multi-byte fields are big-endian.

Frame header (10 bytes):

  +--------+--------+--------+-----------+-----------+----------+
  | magic  | ver    | type   | length    | timestamp | checksum |
  | 1 byte | 1 byte | 1 byte | 2 bytes   | 4 bytes   | 1 byte   |
  +--------+--------+--------+-----------+-----------+----------+

  magic     = 0xAA
  checksum  = XOR of all header bytes except checksum itself

Packet types:

  PKT_METRICS      0x01   server->client   live metrics snapshot
  PKT_CONFIG       0x02   server->client   daemon configuration
  PKT_CMD          0x04   client->server   command request
  PKT_ACK          0x05   server->client   command acknowledgement
  PKT_HISTORY_REQ  0x10   client->server   history request
  PKT_HISTORY_RESP 0x11   server->client   history response
  PKT_SUBSCRIBE    0x12   client->server   subscribe to ring level
  PKT_RING_STATS   0x13   server->client   ring buffer statistics
  PKT_SYS_INFO     0x14   server->client   system information

Session flow:

  Client connects via WebSocket
  Server sends PKT_CONFIG (interval_ms)
  Server sends PKT_METRICS every interval_ms
  Client sends PKT_CMD (CMD_GET_SYS_INFO = 0x11)
  Server sends PKT_SYS_INFO (hostname, os_type, uptime, slots, intervals)
  Client sends PKT_HISTORY_REQ (level, max_count)
  Server sends PKT_HISTORY_RESP (one or more batches, last batch has flag=1)
  Client sends PKT_CMD (CMD_SET_INTERVAL, new_ms)
  Server sends PKT_ACK (OK)
  Server sends PKT_METRICS at new interval

Commands (PKT_CMD.cmd_type):

  CMD_SET_INTERVAL  0x01   arg: interval_ms (uint32)
  CMD_SET_ALERTS    0x02   arg: enabled (uint8)
  CMD_GET_SNAPSHOT  0x03   no arg; server sends PKT_METRICS immediately
  CMD_GET_RING_STATS 0x10  no arg; server sends PKT_RING_STATS
  CMD_GET_SYS_INFO  0x11   no arg; server sends PKT_SYS_INFO
  CMD_START         0x12   resume metrics streaming for this session
  CMD_STOP          0x13   pause  metrics streaming for this session

PKT_SYS_INFO payload (168 bytes):

  hostname[64]     null-terminated hostname string
  os_type[64]      null-terminated "Linux 6.x.y" string
  uptime_sec (8)   system uptime in seconds, big-endian
  slots_l1 (4)     L1 ring capacity
  slots_l2 (4)     L2 ring capacity
  slots_l3 (4)     L3 ring capacity
  interval_ms (4)  collection interval
  agg_l2_ms (4)    L1->L2 aggregation interval
  agg_l3_ms (4)    L2->L3 aggregation interval


DOCKER
------

TinyTrack monitors the *host* system from inside a container by
bind-mounting the host's /proc and /:

  docker run \
    -v /proc:/host/proc:ro \
    -v /:/host/rootfs:ro   \
    -v /dev/shm:/dev/shm   \
    -e TT_PROC_ROOT=/host/proc \
    -e TT_ROOTFS_PATH=/host/rootfs \
    tinytrack

tinytd reads /host/proc/stat, /host/proc/meminfo, etc. — host data.
os_type is read from /host/proc/sys/kernel/ostype + osrelease.
uptime is read from /host/proc/uptime.

NOTE: hostname reflects the container's UTS namespace, not the host.
      This is a Linux kernel limitation.

The live file uses a distinct name (tinytd-docker-live.dat) to avoid
conflict with a host-side tinytd when /dev/shm is shared.
