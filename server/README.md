TinyTrack Server
================

Lightweight Linux system metrics daemon with WebSocket streaming.

Version 0.1.6.  MIT License.


COMPONENTS
----------

  tinytd      metrics collector daemon (CPU, RAM, network, disk, load)
  tinytrack   WebSocket/HTTP gateway
  tiny-cli    CLI client with ncurses dashboard


QUICK START
-----------

On host:

  ./bootstrap.sh && ./configure && make
  sudo make install
  sudo systemctl start tinytd tinytrack

In Docker:

  docker compose up -d

Gateway is available at ws://localhost:25015/websocket.

tiny-cli:

  tiny-cli status
  tiny-cli metrics
  tiny-cli history l1
  tiny-cli dashboard

  docker compose exec tinytrack tiny-cli status
  docker compose exec tinytrack tiny-cli dashboard


DOCUMENTATION
-------------

  docs/OVERVIEW.md        what TinyTrack is and how to use it
  docs/INSTALL.md         installation on host (systemd, users, permissions)
  docs/BUILD.md           building from source
  docs/CONFIGURATION.md   all parameters, priorities, ENV variables
  docs/ARCHITECTURE.md    architecture, shared memory layout, protocol
  docs/DOCKER.md          running in Docker: config, ENV, TLS, examples
  docs/TROUBLESHOOTING.md errors, debugging, diagnostics
  docs/TESTING.md         test suites and how to run them
  docs/HACKING.md         development and contributing


LICENSE
-------

MIT License.  See LICENSE file in the project root.
