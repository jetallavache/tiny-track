#!/bin/sh
# Run gateway integration tests against a live tinytd + tinytrack
# Usage: ./run_gateway_test.sh [port]
set -e

PORT=${1:-4028}
CONF="$(dirname "$0")/../../tests/tinytd-test.conf"
TINYTD="$(dirname "$0")/../../tinytd/tinytd"
TINYTRACK="$(dirname "$0")/../../gateway/tinytrack"

for bin in "$TINYTD" "$TINYTRACK"; do
  [ -f "$bin" ] || { echo "Not found: $bin — run 'make' first"; exit 1; }
done

# Start tinytd
"$TINYTD" -c "$CONF" 2>/dev/null &
TDPID=$!
sleep 2  # wait for mmap to be populated

# Start tinytrack
"$TINYTRACK" -c "$CONF" -p "$PORT" 2>/dev/null &
GWPID=$!
sleep 1

cleanup() {
  kill "$GWPID" "$TDPID" 2>/dev/null
  wait "$GWPID" "$TDPID" 2>/dev/null
}
trap cleanup EXIT INT TERM

# Run tests
cd "$(dirname "$0")"
node test_gateway.js "ws://127.0.0.1:${PORT}/websocket"
