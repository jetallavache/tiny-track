#!/bin/sh
# clean.sh — remove all build and test artifacts for the entire project.
# Run from the project root.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# --- server (C / autotools) ---
sh "$ROOT/server/scripts/clean.sh"

# --- sdk (TypeScript / npm) ---
rm -rf "$ROOT/sdk/node_modules" "$ROOT/sdk/dist" "$ROOT/sdk"/*.tsbuildinfo
echo "sdk: clean done"

# --- demo (React / vite) ---
rm -rf "$ROOT/demo/node_modules" "$ROOT/demo/dist" "$ROOT/demo"/*.tsbuildinfo
echo "demo: clean done"

# --- tests/gateway (Node.js) ---
rm -rf "$ROOT/tests/gateway/node_modules"
echo "tests/gateway: clean done"

# --- Python cache (anywhere in project) ---
find "$ROOT" -name '__pycache__' -not -path '*/.git/*' -type d -exec rm -rf {} + 2>/dev/null || true
find "$ROOT" -name '*.pyc'       -not -path '*/.git/*' -delete 2>/dev/null || true
find "$ROOT" -name '.pytest_cache' -not -path '*/.git/*' -type d -exec rm -rf {} + 2>/dev/null || true

echo "all: clean done"
