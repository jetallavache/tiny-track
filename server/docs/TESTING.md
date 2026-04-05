TESTING
=======

QUICK START
-----------

  ./bootstrap.sh && ./configure && make

  sh tests/run_tests.sh                  fast suite: static + tinytd + cli
  sh tests/run_tests.sh all              all suites including gateway
  sh tests/run_tests.sh docker           gateway tests inside Docker container


TEST LAYOUT
-----------

  tests/
    tinytd/
      test_config.c        unit: INI config parser
      test_metrics.c       unit: metrics aggregation
      test_ringbuf.c       unit: ring buffer writer/reader
      test_shm.c           unit: shared memory
      test_seqlock.c       integration: seqlock under load
      test_shadow_sync.c   integration: shadow file sync
      test_shm_ipc.c       integration: IPC via shared memory
      test_smoke.sh        system: daemon start/stop
      test_signals.sh      system: signal handling
      test_perf.sh         system: performance under load
    cli/
      test_cli_output.c    unit: output formatting
      test_cli_config.c    unit: CLI config loading
      test_cli_binary.sh   integration: tiny-cli binary
    gateway/
      conftest.py          pytest fixtures: start tinytd + tinytrack
      test_ws.py           WebSocket protocol
      test_http.py         HTTP API
      test_tls.py          TLS
      test_sock.py         socket/epoll
      test_load.py         load tests
      test_sysinfo.py      sysinfo: host and Docker
      test_docker_tls.py   TLS tests against running container
      test_gateway.js      JS integration
      run_gateway_tests.sh gateway runner
      run_gateway_test.sh  JS test runner
    bench/
      bench_performance.c  benchmarks (informational, no pass/fail)
    static/
      run_static.sh        cppcheck + -Wall -Wextra -Werror
    sanitize/
      run_sanitizers.sh    ASan + UBSan + Valgrind
    tinytrack.conf-test    shared test config (/tmp paths, debug)
    run_tests.sh           main runner


SUITES (run_tests.sh)
---------------------

  static     cppcheck + compile with -Wall -Wextra -Werror
  tinytd     C unit/integration + shell system tests
  cli        C unit + shell integration tests
  gateway    full gateway suite (ws/http/tls/load/sock/js/sysinfo/sanitize)
  docker     gateway tests inside Docker container
  bench      benchmarks (informational)
  sanitize   ASan+UBSan+Valgrind for C tests
  all        all suites except docker

  Default: static tinytd cli


GATEWAY SUITES (run_gateway_tests.sh)
--------------------------------------

  ws          WebSocket protocol
  http        HTTP API
  tls         TLS (requires openssl)
  load        load tests
  sock        socket/epoll
  js          JS integration (requires node)
  sysinfo     sysinfo on host + in Docker
  docker      full gateway suite in container
  docker-tls  TLS tests in container
  sanitize    gateway under ASan+UBSan
  valgrind    gateway under valgrind
  all         ws+http+tls+load+sock+js+sysinfo+sanitize+valgrind

  Default: ws http tls load sock js


DEPENDENCIES
------------

  gcc >= 9                  C tests
  python3 >= 3.9 + pytest   gateway tests
  openssl                   TLS tests
  node >= 18 + npm          JS integration tests
  docker                    Docker integration tests
  cppcheck                  static analysis (optional)
  valgrind                  memory checks (optional)

Ubuntu/Debian:

  sudo apt install gcc make autoconf automake libssl-dev libncurses-dev \
      python3 python3-pytest nodejs npm cppcheck valgrind

openSUSE:

  sudo zypper install gcc make autoconf automake libopenssl-devel \
      ncurses-devel python3 python3-pytest nodejs npm cppcheck valgrind

Automatic setup:

  sh scripts/setup-test-env.sh


TEST CONFIGURATION
------------------

All tests share tests/tinytrack.conf-test.
Paths are under /tmp/ to avoid permission issues.

  [tinytd]
  log_level = debug
  log_backend = stderr
  pid_file = /tmp/tinytd-test.pid

  [collection]
  interval_ms = 500
  proc_root = /proc
  rootfs_path = /

  [storage]
  live_path   = /tmp/tinytd-test-live.dat
  shadow_path = /tmp/tinytd-test-shadow.dat

  [ringbuffer]
  l1_capacity = 20
  l2_capacity = 10
  l3_capacity = 5
  l2_agg_interval_sec = 10
  l3_agg_interval_sec = 60

  [gateway]
  listen = ws://0.0.0.0:14029
  update_interval = 500

Test ports:

  14028   plain WS (pytest gateway fixture)
  14029   plain WS (config default)
  14030   Docker sysinfo test
  14032   Docker gateway suite
  14033   Docker TLS suite
  14443   TLS WS


ENVIRONMENT VARIABLES
---------------------

  TINYTRACK_TEST_PORT     gateway port for pytest        (default: 14028)
  TINYTRACK_DOCKER_PORT   Docker sysinfo test port       (default: 14030)
  TT_PROC_ROOT            /proc path for Docker tests    (default: /proc)
  TT_ROOTFS_PATH          rootfs path for Docker tests   (default: /)


DOCKER TESTS
------------

Requires Docker daemon access:

  sudo usermod -aG docker $USER
  newgrp docker

  sh tests/run_tests.sh docker
  sh tests/gateway/run_gateway_tests.sh docker
  sh tests/gateway/run_gateway_tests.sh docker-tls


TROUBLESHOOTING
---------------

"tinytd did not create live file":

  ./tinytd/tinytd --no-daemon -c tests/tinytrack.conf-test

Port already in use:

  ss -tlnp | grep 14028
  pkill -f tinytrack

Stale processes:

  pkill -f "tinytd|tinytrack"
  rm -f /tmp/tinytd-test*.dat /tmp/tinytd-test.pid /tmp/tinytrack-test.pid

Docker permission denied:

  sudo usermod -aG docker $USER && newgrp docker

JS tests: "Cannot find module 'ws'":

  cd tests/gateway && npm install
