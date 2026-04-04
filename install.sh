#!/usr/bin/env bash
# TinyTrack — one-line installer
# Usage: curl -fsSL https://raw.githubusercontent.com/jetallavache/tiny-track/main/install.sh | bash
#
# What it does:
#   1. Detects OS (Debian/Ubuntu/RHEL/Arch)
#   2. Installs build deps if needed
#   3. Clones the repo (or uses existing)
#   4. Builds and installs tinytd + tinytrack + tiny-cli
#   5. Enables and starts systemd services
#
# Options (env vars):
#   TINYTRACK_VERSION=main   git branch/tag to install
#   TINYTRACK_PREFIX=/usr/local  install prefix
#   TINYTRACK_NO_SERVICE=1   skip systemd enable/start
#   TINYTRACK_DOCKER=1       install via Docker instead of building

set -euo pipefail

REPO="https://github.com/jetallavache/tiny-track.git"
VERSION="${TINYTRACK_VERSION:-main}"
PREFIX="${TINYTRACK_PREFIX:-/usr/local}"
TMPDIR="$(mktemp -d)"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

info()  { printf '\033[0;34m[tinytrack]\033[0m %s\n' "$*"; }
ok()    { printf '\033[0;32m[tinytrack]\033[0m %s\n' "$*"; }
err()   { printf '\033[0;31m[tinytrack] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

need_cmd() { command -v "$1" &>/dev/null || err "Required command not found: $1"; }

cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

# ---------------------------------------------------------------------------
# OS detection
# ---------------------------------------------------------------------------

detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "${ID:-unknown}"
  else
    uname -s | tr '[:upper:]' '[:lower:]'
  fi
}

install_deps() {
  local os="$1"
  info "Installing build dependencies for $os..."
  case "$os" in
    ubuntu|debian|raspbian)
      sudo apt-get update -qq
      sudo apt-get install -y --no-install-recommends \
        git gcc make autoconf automake libtool pkg-config \
        libssl-dev libncurses-dev
      ;;
    fedora|rhel|centos|rocky|almalinux)
      sudo dnf install -y \
        git gcc make autoconf automake libtool pkgconfig \
        openssl-devel ncurses-devel
      ;;
    arch|manjaro)
      sudo pacman -Sy --noconfirm \
        git gcc make autoconf automake libtool pkg-config \
        openssl ncurses
      ;;
    *)
      info "Unknown OS '$os' — skipping automatic dependency install."
      info "Please ensure: git gcc make autoconf automake libtool pkg-config libssl-dev libncurses-dev"
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Docker install path
# ---------------------------------------------------------------------------

install_docker() {
  need_cmd docker
  info "Pulling tinytrack Docker image..."
  docker pull jetallavache/tinytrack:latest

  info "Creating docker-compose.yml in current directory..."
  cat > tinytrack-compose.yml <<'EOF'
services:
  tinytrack:
    image: jetallavache/tinytrack:latest
    restart: unless-stopped
    ports:
      - "25015:25015"
    volumes:
      - /proc:/host/proc:ro
      - /:/host/rootfs:ro
      - /dev/shm:/dev/shm
    environment:
      TT_PROC_ROOT: /host/proc
      TT_ROOTFS_PATH: /host/rootfs
EOF

  ok "Docker image pulled. Start with:"
  echo "  docker compose -f tinytrack-compose.yml up -d"
  echo "  Connect to: ws://localhost:25015/websocket"
}

# ---------------------------------------------------------------------------
# Native build + install
# ---------------------------------------------------------------------------

install_native() {
  local os="$1"
  install_deps "$os"

  info "Cloning tiny-track @ $VERSION..."
  git clone --depth=1 --branch "$VERSION" "$REPO" "$TMPDIR/tiny-track"
  cd "$TMPDIR/tiny-track/server"

  info "Building..."
  ./bootstrap.sh
  ./configure --prefix="$PREFIX"
  make -j"$(nproc)"

  info "Installing to $PREFIX..."
  sudo make install

  # ---------------------------------------------------------------------------
  # Systemd
  # ---------------------------------------------------------------------------
  if [ "${TINYTRACK_NO_SERVICE:-0}" = "1" ]; then
    ok "Skipping systemd setup (TINYTRACK_NO_SERVICE=1)"
    return
  fi

  if ! command -v systemctl &>/dev/null; then
    info "systemd not found — skipping service setup"
    return
  fi

  info "Enabling and starting services..."
  sudo systemctl daemon-reload
  sudo systemctl enable --now tinytd tinytrack

  ok "Services started!"
  echo ""
  echo "  Status:  sudo systemctl status tinytrack"
  echo "  Logs:    sudo journalctl -u tinytrack -f"
  echo "  CLI:     tiny-cli dashboard"
  echo "  WS:      ws://localhost:25015/websocket"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  info "TinyTrack installer (version: $VERSION)"
  echo ""

  # Docker shortcut
  if [ "${TINYTRACK_DOCKER:-0}" = "1" ]; then
    install_docker
    exit 0
  fi

  # Check we're on Linux
  [ "$(uname -s)" = "Linux" ] || err "Only Linux is supported for native install. Use TINYTRACK_DOCKER=1 for other platforms."

  # Check root/sudo
  if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
    info "This installer requires sudo access for installing to $PREFIX and managing services."
    sudo -v || err "sudo access required"
  fi

  need_cmd git

  local os
  os="$(detect_os)"
  info "Detected OS: $os"

  install_native "$os"

  ok "TinyTrack installed successfully!"
}

main "$@"
