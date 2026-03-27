TinyTrack - Lightweight System Monitoring Daemon
================================================

TinyTrack is a minimal system monitoring solution designed for resource-
constrained VDS environments (1GB RAM, 1 CPU core). It provides real-time
system metrics collection with minimal overhead.

FEATURES
--------

* Low resource usage: <1% CPU, <10MB RAM
* Real-time metrics: CPU, memory, network, disk, load average
* Three-tier ring buffer: 1h/24h/7d retention
* Multiple interfaces: CLI, HTTP/WebSocket gateway
* Zero-copy shared memory architecture
* Event-driven design with epoll

REQUIREMENTS
------------

* Linux kernel 2.6.27 or later
* GCC with C11 support
* POSIX-compliant system
* /dev/shm support (tmpfs)

INSTALLATION
------------

From source:

    ./bootstrap.sh
    ./configure
    make
    make install

See INSTALL for detailed instructions.

USAGE
-----

Start daemon:

    <!-- tinytd -->

Query status:

    tiny-cli status
    tiny-cli live

Start gateway:

    tinytrack --port 4026

ARCHITECTURE
------------

    tinytd (daemon)
        |
        v
    /dev/shm/tinytd-live.dat (shared memory)
        |
        +---> tiny-cli (CLI consumer)
        +---> tinytrack (HTTP/WS gateway)

DOCUMENTATION
-------------

* docs/INSTALL.md   - Installation instructions
* docs/BUILD.md     - Building from source
* docs/HACKING.md   - Developer guide

See man pages: tinytd(8), tiny-cli(1), tinytrack(8)

LICENSE
-------

This program is free software; you can redistribute it and/or modify
it under the terms of the MIT License. See LICENSE file for details.

REPORTING BUGS
--------------

Report bugs to: <bugs@example.com>
Project homepage: <https://github.com/jetallavache/tiny-track>

COPYRIGHT
---------

Copyright (C) 2026 TinyTrack Project
