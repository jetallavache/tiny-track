DOCKER
======

TinyTrack monitors the *host* system from inside a container by
bind-mounting the host's /proc and /.


QUICK START
-----------

docker compose (recommended):

  docker compose up -d
  docker compose logs -f
  docker compose down

docker run:

  docker build -t tinytrack .

  docker run -d \
    -v /proc:/host/proc:ro \
    -v /:/host/rootfs:ro   \
    -v /dev/shm:/dev/shm   \
    -p 25015:25015         \
    tinytrack

Gateway: ws://localhost:25015/websocket


CONFIGURATION
-------------

Option 1 — ENV variables:

  docker run -d \
    -v /proc:/host/proc:ro -v /:/host/rootfs:ro -v /dev/shm:/dev/shm \
    -p 25015:25015 \
    -e TT_INTERVAL_MS=500 \
    -e TT_L1_CAPACITY=7200 \
    -e TT_LOG_LEVEL=debug \
    tinytrack

  See CONFIGURATION.md for the full list of ENV variables.

Option 2 — custom config file:

  docker run -d \
    -v /proc:/host/proc:ro -v /:/host/rootfs:ro -v /dev/shm:/dev/shm \
    -v /path/to/my.conf:/etc/tinytrack/tinytrack.conf:ro \
    -p 25015:25015 \
    tinytrack

  NOTE: ENV variables patch the config even when a file is mounted.
        ENV always takes priority.

Option 3 — docker-compose with custom config:

  services:
    tinytrack:
      image: tinytrack:latest
      volumes:
        - /proc:/host/proc:ro
        - /:/host/rootfs:ro
        - /dev/shm:/dev/shm
        - ./my.conf:/etc/tinytrack/tinytrack.conf:ro
        - tinytrack-data:/var/lib/tinytrack
      ports:
        - "25015:25015"

  volumes:
    tinytrack-data:


TLS
---

  openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt \
      -days 365 -nodes -subj '/CN=localhost'

  docker run -d \
    -v /proc:/host/proc:ro -v /:/host/rootfs:ro -v /dev/shm:/dev/shm \
    -v $(pwd)/certs:/certs:ro \
    -p 25015:25015 \
    -e TT_LISTEN=wss://0.0.0.0:25015 \
    -e TT_TLS_CERT=/certs/server.crt \
    -e TT_TLS_KEY=/certs/server.key \
    tinytrack

  Connect: wss://localhost:25015/websocket


TINY-CLI INSIDE CONTAINER
--------------------------

  docker exec -it <container> tiny-cli status
  docker exec -it <container> tiny-cli metrics
  docker exec -it <container> tiny-cli history l1
  docker exec -it <container> tiny-cli dashboard

  docker compose exec tinytrack tiny-cli status
  docker compose exec tinytrack tiny-cli dashboard


PERSISTENT DATA
---------------

The shadow file lives in /var/lib/tinytrack/.
Mount a named volume to preserve history across restarts:

  volumes:
    - tinytrack-data:/var/lib/tinytrack


LIMITATIONS
-----------

  hostname    Container UTS namespace, not the host (kernel limitation)
  os_type     Host kernel from /host/proc/sys/kernel/ostype  [correct]
  uptime      Host uptime from /host/proc/uptime             [correct]
  CPU/RAM/Net Host data via /host/proc                       [correct]
  Disk        statvfs(/host/rootfs) — host disk              [correct]

  WARNING: never mount / with write permissions.  Always use :ro.


LIVE FILE NAMING
----------------

The Docker config uses tinytd-docker-live.dat instead of tinytd-live.dat
to avoid conflict with a host-side tinytd when /dev/shm is shared between
host and container.
