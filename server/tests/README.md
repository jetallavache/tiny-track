TinyTrack Tests
===============

See docs/TESTING.md for the full testing guide.

Quick Start
-----------

    sh tests/run_tests.sh              # fast suite: static + tinytd + cli
    sh tests/run_tests.sh all          # everything including gateway

Test Configuration
------------------

All tests use a single shared config: tests/tinytrack.conf-test

Manual Gateway Test
-------------------

Located in `tests/gateway/manual-gateway-test/`:

    cd tests/gateway/manual-gateway-test
    python3 -m http.server 8000
    # Open http://localhost:8000 in browser

Cleanup
-------

    sh scripts/clean.sh
