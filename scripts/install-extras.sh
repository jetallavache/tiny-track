#!/bin/sh
# Install tiny-cli shell completions and man pages.
# Run from the project root after `make install`.

set -e

PREFIX="${PREFIX:-/usr/local}"
MANDIR="${MANDIR:-$PREFIX/share/man}"
BASHCOMPDIR="${BASHCOMPDIR:-/etc/bash_completion.d}"
ZSHCOMPDIR="${ZSHCOMPDIR:-/usr/share/zsh/site-functions}"

install_man() {
  install -d "$MANDIR/man1" "$MANDIR/man8"
  install -m 644 docs/man/tiny-cli.1 "$MANDIR/man1/tiny-cli.1"
  install -m 644 docs/man/tinytd.8   "$MANDIR/man8/tinytd.8"
  echo "Installed man pages to $MANDIR"
}

install_bash() {
  if [ -d "$BASHCOMPDIR" ]; then
    install -m 644 scripts/completion/tiny-cli.bash \
      "$BASHCOMPDIR/tiny-cli"
    echo "Installed bash completion to $BASHCOMPDIR/tiny-cli"
  else
    echo "Skipping bash completion: $BASHCOMPDIR not found"
  fi
}

install_zsh() {
  if [ -d "$ZSHCOMPDIR" ]; then
    install -m 644 scripts/completion/tiny-cli.zsh \
      "$ZSHCOMPDIR/_tiny-cli"
    echo "Installed zsh completion to $ZSHCOMPDIR/_tiny-cli"
  else
    echo "Skipping zsh completion: $ZSHCOMPDIR not found"
  fi
}

install_man
install_bash
install_zsh

echo "Done. Reload your shell or run: source $BASHCOMPDIR/tiny-cli"
