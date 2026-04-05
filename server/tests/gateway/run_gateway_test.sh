#!/bin/sh
# Run JS gateway integration tests.
# Usage: ./run_gateway_test.sh [port]
# If port is already listening, skip starting daemons (assume external).

PORT=${1:-14031}
CONF="$(dirname "$0")/../../tests/tinytrack.conf-test"
TINYTD="$(dirname "$0")/../../tinytd/tinytd"
TINYTRACK="$(dirname "$0")/../../gateway/tinytrack"

for bin in "$TINYTD" "$TINYTRACK"; do
  [ -f "$bin" ] || { echo "Not found: $bin — run 'make' first"; exit 1; }
done

TDPID=""; GWPID=""

port_open() { python3 -c "import socket; socket.create_connection(('127.0.0.1', $PORT), 0.3)" 2>/dev/null; }

if ! port_open; then
  "$TINYTD"    --no-daemon -c "$CONF" >/dev/null 2>&1 &
  TDPID=$!
  sleep 1

  "$TINYTRACK" --no-daemon -c "$CONF" -p "$PORT" >/dev/null 2>&1 &
  GWPID=$!

  i=0
  while [ $i -lt 20 ] && ! port_open; do
    sleep 0.2; i=$((i+1))
  done
fi

cleanup() {
  [ -n "$GWPID" ] && kill "$GWPID" 2>/dev/null; wait "$GWPID" 2>/dev/null
  [ -n "$TDPID" ] && kill "$TDPID" 2>/dev/null; wait "$TDPID" 2>/dev/null
}
trap cleanup EXIT INT TERM

cd "$(dirname "$0")"
node test_gateway.js "ws://127.0.0.1:${PORT}/websocket"
