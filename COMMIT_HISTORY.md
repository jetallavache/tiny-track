Git Commit History for TinyTrack
================================

Initial Setup & Core Infrastructure
------------------------------------

commit: Initial project structure
- Add LICENSE (MIT)
- Add .gitignore
- Add README.md with project overview
- Add basic directory structure (common/, tinytd/, cli/, gateway/)

commit: Add shared memory ring buffer implementation
- Implement common/ring/shm.c for shared memory management
- Implement common/ring/layout.h for memory layout definitions
- Implement common/ring/writer.c for ring buffer writer
- Implement common/ring/reader.c for ring buffer reader
- Add protocol definition in common/proto/v1.h

commit: Add logging subsystem
- Implement common/sink/core.c for logging core
- Add stderr, syslog, and systemd journal backends
- Add common/sink/log.h public API
- Add common/sink/log_internal.h for internal structures

commit: Add configuration system
- Implement common/config/ini.c for INI file parsing
- Implement common/config/paths.c for path resolution
- Implement common/config/reader.c for config reading
- Add etc/tinytrack.conf example configuration

commit: Add utility functions
- Implement common/utils/str.c for string utilities
- Implement common/utils/util.c for general utilities
- Implement common/utils/b64.c for base64 encoding
- Implement common/timer.c for timer utilities

Daemon Implementation (tinytd)
-------------------------------

commit: Implement metrics collector
- Add tinytd/src/collector.c for system metrics collection
- Implement CPU usage collection from /proc/stat
- Implement memory usage from /proc/meminfo
- Implement network stats from /proc/net/dev
- Implement load average from /proc/loadavg
- Implement disk usage via statvfs syscall

commit: Implement daemon runtime
- Add tinytd/src/runtime.c for event loop
- Implement epoll-based event handling
- Add timerfd integration for periodic sampling
- Implement L2/L3 aggregation scheduling

commit: Implement daemon configuration
- Add tinytd/src/config.c for daemon-specific config
- Add config validation and defaults
- Add environment variable support

commit: Implement ring buffer writer wrapper
- Add tinytd/src/writer.c as wrapper around common/ring/writer
- Add convenience functions for daemon use

commit: Implement daemon main
- Add tinytd/src/main.c with main loop
- Add signal handling (SIGTERM, SIGINT)
- Add proper initialization and cleanup
- Add debug logging for troubleshooting

CLI Client Implementation (tiny-cli)
-------------------------------------

commit: Implement CLI reader
- Add cli/src/reader.c for reading from shared memory
- Implement safe mmap access
- Add error handling for missing/invalid data

commit: Implement CLI display
- Add cli/src/display.c for formatting output
- Implement status display
- Implement live metrics display
- Add color support for terminal output

commit: Implement CLI commands
- Add cli/src/commands.c for command handling
- Implement 'status' command
- Implement 'live' command for real-time monitoring
- Add command-line argument parsing

commit: Implement CLI main
- Add cli/src/main.c with command dispatcher
- Add usage help
- Add error handling

Gateway Implementation (tinytrack)
-----------------------------------

commit: Implement network manager
- Add gateway/src/net.c for network I/O
- Implement connection management
- Add timer support for periodic tasks

commit: Implement socket operations
- Add gateway/src/sock.c for socket handling
- Implement accept, connect, read, write operations
- Add non-blocking I/O support

commit: Implement HTTP server
- Add gateway/src/http.c for HTTP protocol
- Implement request parsing
- Implement response generation
- Add REST API endpoints

commit: Implement WebSocket support
- Add gateway/src/ws.c for WebSocket protocol
- Implement handshake (RFC 6455)
- Implement frame encoding/decoding
- Add ping/pong support

commit: Implement event system
- Add gateway/src/event.c for event callbacks
- Add connection lifecycle events
- Add HTTP and WebSocket message events

commit: Implement gateway reader
- Add gateway/src/reader.c for reading metrics
- Implement safe shared memory access
- Add caching for performance

commit: Implement gateway main
- Add gateway/src/main.c with HTTP/WS server
- Add metrics broadcasting to WebSocket clients
- Add configurable update intervals
- Add REST API for latest metrics

Build System & Packaging
-------------------------

commit: Add autotools build system
- Add configure.ac with feature detection
- Add Makefile.am for each component
- Add bootstrap.sh for git builds
- Check for required libraries (librt, libcrypto)
- Add optional systemd support detection

commit: Add systemd integration
- Add etc/systemd/tinytd.service unit file
- Add systemd installation in autotools
- Add proper user/group handling

commit: Add installation targets
- Configure install paths for binaries
- Configure install paths for config files
- Configure install paths for documentation
- Add DESTDIR support for packaging

commit: Add distribution targets
- Implement 'make dist' for tarball creation
- Implement 'make distcheck' for verification
- Add EXTRA_DIST for non-source files

commit: Add code formatting support
- Add .clang-format configuration
- Add 'make format' target
- Add 'make format-check' target

Documentation
-------------

commit: Add installation guide
- Add INSTALL.md with detailed instructions
- Document prerequisites
- Document build options
- Document troubleshooting

commit: Add build guide
- Add BUILD.md for building from source
- Document autotools workflow
- Document configuration options

commit: Add developer guide
- Add HACKING.md for contributors
- Document code structure
- Document adding new features
- Document testing procedures

Bug Fixes & Optimizations
--------------------------

commit: Fix file permissions for shared memory
- Change default file_mode from 0600 to 0644
- Update etc/tinytrack.conf with correct decimal value (420)
- Add comments explaining octal/decimal conversion
- Fix tiny-cli access denied issue

commit: Fix GCC optimization bug
- Disable -O2 optimization due to pointer aliasing bug
- Use -O0 to prevent segfault in ttd_runtime_poll
- Add comment explaining the issue
- Add workaround by saving writer pointer locally
- Keep -O0 as default until proper fix found

commit: Add defensive checks
- Add NULL pointer checks in ttd_runtime_poll
- Add validation in ttd_writer_write_l1
- Add validation in tt_ring_writer_write_l1
- Add diagnostic logging for debugging

commit: Remove volatile from rt structure
- Clean up unnecessary volatile qualifier
- Rely on -O0 instead of volatile

Testing & Examples
------------------

commit: Add manual test scripts
- Add tests/manual-gateway-test/ for WebSocket testing
- Add example HTML client
- Add test documentation

commit: Add example configurations
- Add .env.example for environment variables
- Add example systemd service file
- Add example config with comments

Project Metadata
----------------

commit: Update README
- Add feature list
- Add architecture diagram
- Add usage examples
- Add links to documentation

commit: Add VS Code configuration
- Add .vscode/settings.json for development
- Add .vscode/launch.json for debugging
- Add .vscode/tasks.json for build tasks

commit: Add .prettierrc for code formatting
- Configure Prettier for consistent formatting

Final Polish
------------

commit: Clean up debug logging
- Remove excessive debug output
- Keep essential diagnostic messages
- Improve log message clarity

commit: Update documentation
- Fix typos and formatting
- Add missing sections
- Improve clarity and examples

commit: Prepare for v0.1.0 release
- Bump version to 0.1.0
- Update changelog
- Tag release
