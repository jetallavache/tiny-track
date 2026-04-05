# TinyTrack server — tinytd + tiny-cli + tinytrack gateway
# Monitors the *host* system via bind-mounted /proc and /.
#
# Build:
#   docker build -t tinytrack .
#
# Run (host monitoring):
#   docker run -d \
#     -v /proc:/host/proc:ro \
#     -v /:/host/rootfs:ro   \
#     -v /dev/shm:/dev/shm   \
#     -p 25015:25015         \
#     tinytrack

# ---------------------------------------------------------------------------
# Stage 1 — build
# ---------------------------------------------------------------------------
FROM debian:bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc make autoconf automake libtool pkg-config \
    libssl-dev libncurses-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY . .

RUN ./bootstrap.sh && ./configure && make

# ---------------------------------------------------------------------------
# Stage 2 — runtime
# ---------------------------------------------------------------------------
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 libncurses6 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /etc/tinytrack /var/lib/tinytrack /var/run

COPY --from=builder /build/tinytd/tinytd         /usr/local/bin/tinytd
COPY --from=builder /build/cli/tiny-cli          /usr/local/bin/tiny-cli
COPY --from=builder /build/gateway/tinytrack     /usr/local/bin/tinytrack
COPY docker-entrypoint.sh                        /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Config is generated from ENV at startup, or can be bind-mounted:
#   -v /path/to/tinytrack.conf:/etc/tinytrack/tinytrack.conf:ro
VOLUME ["/etc/tinytrack", "/var/lib/tinytrack"]

# Paths to the host's /proc and rootfs bind-mounted at runtime.
# Override with -e TT_PROC_ROOT=... / -e TT_ROOTFS_PATH=... if needed.
ENV TT_PROC_ROOT=/host/proc \
    TT_ROOTFS_PATH=/host/rootfs

EXPOSE 25015

# Run both daemons: tinytd (collector) then tinytrack (gateway).
# Use a simple shell wrapper so both processes run and the container
# exits if either one dies.
CMD ["docker-entrypoint.sh"]
