#!/bin/sh
# clean.sh — remove all build and test artifacts for the entire project.
# Run from the project root.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# --- server (C / autotools) ---
sh "$ROOT/server/scripts/clean.sh"

# --- sdk (TypeScript / npm) ---
rm -rf "$ROOT/sdk/node_modules" "$ROOT/sdk/dist" "$ROOT/sdk/storybook-static" "$ROOT/sdk"/*.tsbuildinfo
echo "sdk: clean done"

# --- sdk-lite (TypeScript / npm) ---
rm -rf "$ROOT/sdk-lite/node_modules" "$ROOT/sdk-lite/dist"
echo "sdk-lite: clean done"

# --- demo (React / vite) ---
rm -rf "$ROOT/demo/node_modules" "$ROOT/demo/dist" "$ROOT/demo"/*.tsbuildinfo
echo "demo: clean done"

# --- docs-site (Next / vite) ---
rm -rf "$ROOT/docs-site/node_modules" "$ROOT/docs-site/.next"
echo "docs-site: clean done"

# --- Python cache (anywhere in project) ---
find "$ROOT" -name '__pycache__' -not -path '*/.git/*' -type d -exec rm -rf {} + 2>/dev/null || true
find "$ROOT" -name '*.pyc'       -not -path '*/.git/*' -delete 2>/dev/null || true
find "$ROOT" -name '.pytest_cache' -not -path '*/.git/*' -type d -exec rm -rf {} + 2>/dev/null || true

echo "all: clean done"
