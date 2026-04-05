#!/bin/sh
# docker-entrypoint.sh — generate config from ENV vars, then start daemons.
#
# ENV variables (all optional, override config file values):
#
#   System paths (bind-mount targets):
#     TT_PROC_ROOT          path to host /proc  (default: /host/proc)
#     TT_ROOTFS_PATH        path to host /       (default: /host/rootfs)
#
#   Collection:
#     TT_INTERVAL_MS        collection interval in ms        (default: 1000)
#     TT_DU_INTERVAL_SEC    disk usage refresh interval, s   (default: 30)
#
#   Storage:
#     TT_LIVE_PATH          live ring buffer file            (default: /dev/shm/tinytd-docker-live.dat)
#     TT_SHADOW_PATH        shadow (persistent) file         (default: /var/lib/tinytrack/tinytd-shadow.dat)
#
#   Ring buffer capacities:
#     TT_L1_CAPACITY        L1 ring capacity (samples)       (default: 3600)
#     TT_L2_CAPACITY        L2 ring capacity (samples)       (default: 1440)
#     TT_L3_CAPACITY        L3 ring capacity (samples)       (default: 720)
#     TT_L2_AGG_INTERVAL    L1→L2 aggregation interval, s   (default: 60)
#     TT_L3_AGG_INTERVAL    L2→L3 aggregation interval, s   (default: 3600)
#
#   Gateway:
#     TT_LISTEN             listen address  ws:// or wss://  (default: ws://0.0.0.0:25015)
#     TT_UPDATE_INTERVAL    push interval to clients, ms     (default: 1000)
#     TT_LOG_LEVEL          log level: debug/info/notice/warning/error (default: info)
#     TT_LOG_BACKEND        log backend: docker/stdout/stderr (default: docker)
#
#   TLS (required when TT_LISTEN starts with wss://):
#     TT_TLS_CERT           path to PEM certificate file
#     TT_TLS_KEY            path to PEM private key file
#     TT_TLS_CA             path to PEM CA bundle (optional, for client cert auth)

set -e

CONF=/etc/tinytrack/tinytrack.conf
LIVE="${TT_LIVE_PATH:-/dev/shm/tinytd-docker-live.dat}"

# ---------------------------------------------------------------------------
# If no config file is mounted, write one from defaults + ENV overrides
# ---------------------------------------------------------------------------
if [ ! -f "$CONF" ]; then
    mkdir -p /etc/tinytrack
    cat > "$CONF" << 'CONF_EOF'
[tinytd]
user  = root
group = root
pid_file     = /var/run/tinytd.pid
log_backend  = docker
log_level    = info

[collection]
interval_ms     = 1000
du_interval_sec = 30
proc_root       = /host/proc
rootfs_path     = /host/rootfs

[storage]
live_path                = /dev/shm/tinytd-docker-live.dat
shadow_path              = /var/lib/tinytrack/tinytd-shadow.dat
shadow_sync_interval_sec = 60
file_mode                = 384

[ringbuffer]
l1_capacity         = 3600
l2_capacity         = 1440
l2_agg_interval_sec = 60
l3_capacity         = 720
l3_agg_interval_sec = 3600

[recovery]
enable_crc   = true
auto_recover = true

[gateway]
user  = root
group = root
pid_file        = /var/run/tinytrack.pid
log_backend     = docker
log_level       = info
listen          = ws://0.0.0.0:25015
update_interval = 1000
CONF_EOF
fi

# ---------------------------------------------------------------------------
# Apply ENV overrides (sed in-place on the generated or mounted config)
# ---------------------------------------------------------------------------
apply() {
    # apply KEY VALUE — replace "key = <anything>" in config
    key="$1"; val="$2"
    sed -i "s|^\(${key}\s*=\s*\).*|\1${val}|" "$CONF"
}

[ -n "${TT_PROC_ROOT:-}"         ] && apply proc_root          "$TT_PROC_ROOT"
[ -n "${TT_ROOTFS_PATH:-}"       ] && apply rootfs_path        "$TT_ROOTFS_PATH"
[ -n "${TT_INTERVAL_MS:-}"       ] && apply interval_ms        "$TT_INTERVAL_MS"
[ -n "${TT_DU_INTERVAL_SEC:-}"   ] && apply du_interval_sec    "$TT_DU_INTERVAL_SEC"
[ -n "${TT_LIVE_PATH:-}"         ] && apply live_path          "$TT_LIVE_PATH"
[ -n "${TT_SHADOW_PATH:-}"       ] && apply shadow_path        "$TT_SHADOW_PATH"
[ -n "${TT_L1_CAPACITY:-}"       ] && apply l1_capacity        "$TT_L1_CAPACITY"
[ -n "${TT_L2_CAPACITY:-}"       ] && apply l2_capacity        "$TT_L2_CAPACITY"
[ -n "${TT_L3_CAPACITY:-}"       ] && apply l3_capacity        "$TT_L3_CAPACITY"
[ -n "${TT_L2_AGG_INTERVAL:-}"   ] && apply l2_agg_interval_sec "$TT_L2_AGG_INTERVAL"
[ -n "${TT_L3_AGG_INTERVAL:-}"   ] && apply l3_agg_interval_sec "$TT_L3_AGG_INTERVAL"
[ -n "${TT_LISTEN:-}"            ] && apply listen             "$TT_LISTEN"
[ -n "${TT_UPDATE_INTERVAL:-}"   ] && apply update_interval    "$TT_UPDATE_INTERVAL"
[ -n "${TT_LOG_LEVEL:-}"         ] && apply log_level          "$TT_LOG_LEVEL"
[ -n "${TT_LOG_BACKEND:-}"       ] && apply log_backend        "$TT_LOG_BACKEND"

# TLS — append to config only if not already present
if [ -n "${TT_TLS_CERT:-}" ]; then
    grep -q "^tls_cert" "$CONF" \
        && sed -i "s|^tls_cert.*|tls_cert = $TT_TLS_CERT|" "$CONF" \
        || echo "tls_cert = $TT_TLS_CERT" >> "$CONF"
fi
if [ -n "${TT_TLS_KEY:-}" ]; then
    grep -q "^tls_key" "$CONF" \
        && sed -i "s|^tls_key.*|tls_key = $TT_TLS_KEY|" "$CONF" \
        || echo "tls_key  = $TT_TLS_KEY" >> "$CONF"
fi
if [ -n "${TT_TLS_CA:-}" ]; then
    grep -q "^tls_ca" "$CONF" \
        && sed -i "s|^tls_ca.*|tls_ca = $TT_TLS_CA|" "$CONF" \
        || echo "tls_ca   = $TT_TLS_CA" >> "$CONF"
fi

# Re-read LIVE_PATH after potential override
LIVE=$(grep "^live_path" "$CONF" | head -1 | sed 's/.*=\s*//')

# ---------------------------------------------------------------------------
# Start daemons
# ---------------------------------------------------------------------------
rm -f "$LIVE"

tinytd --no-daemon --config "$CONF" &
TD_PID=$!

i=0
while [ $i -lt 50 ] && [ ! -f "$LIVE" ]; do
    sleep 0.2
    i=$((i+1))
done

tinytrack --no-daemon --config "$CONF" &

wait $TD_PID
