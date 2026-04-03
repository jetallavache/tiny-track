#!/bin/sh
# Bootstrap autotools from git repository

set -e

echo "Running autoreconf..."
autoreconf --install --force --verbose

echo ""
echo "Bootstrap complete. Now run:"
echo "  ./configure"
echo "  make"
