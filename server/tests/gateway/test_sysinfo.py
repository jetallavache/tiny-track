"""
test_sysinfo.py — validate PKT_SYS_INFO response from the gateway.

Two fixtures drive the same test suite:
  - `gateway`        : daemons running on the host (from conftest.py)
  - `gateway_docker` : daemons running inside a Docker container that
                       bind-mounts the host's /proc and /

The tests assert that sysinfo reflects the *host* system in both cases.
"""
import os
import platform
import re
import socket
import struct
import subprocess
import time

import pytest

# ---------------------------------------------------------------------------
# Re-use WS helpers from test_ws.py
# ---------------------------------------------------------------------------
from test_ws import (
    WSClient,
    OP_BINARY,
    PROTO_V1,
    PROTO_V2,
    PKT_ACK,
    build_header,
    build_cmd,
    parse_frame,
    recv_until,
)

# v2 constants not imported from test_ws
PKT_SYS_INFO     = 0x14
CMD_GET_SYS_INFO = 0x11

# ---------------------------------------------------------------------------
# sysinfo packet parser  (mirrors struct tt_proto_sysinfo, 168 bytes)
# hostname(64) os_type(64) uptime_sec(8BE) slots_l1(4BE) slots_l2(4BE)
# slots_l3(4BE) interval_ms(4BE) agg_l2_ms(4BE) agg_l3_ms(4BE)
# ---------------------------------------------------------------------------
SYSINFO_FMT = "!64s64sQIIIIII"
SYSINFO_SIZE = struct.calcsize(SYSINFO_FMT)  # 168


def parse_sysinfo(payload: bytes) -> dict:
    assert len(payload) >= SYSINFO_SIZE, (
        f"sysinfo payload too short: {len(payload)} < {SYSINFO_SIZE}"
    )
    (hostname_b, os_type_b, uptime_sec,
     slots_l1, slots_l2, slots_l3,
     interval_ms, agg_l2_ms, agg_l3_ms) = struct.unpack_from(SYSINFO_FMT, payload)
    return {
        "hostname":    hostname_b.rstrip(b"\x00").decode(errors="replace"),
        "os_type":     os_type_b.rstrip(b"\x00").decode(errors="replace"),
        "uptime_sec":  uptime_sec,
        "slots_l1":    slots_l1,
        "slots_l2":    slots_l2,
        "slots_l3":    slots_l3,
        "interval_ms": interval_ms,
        "agg_l2_ms":   agg_l2_ms,
        "agg_l3_ms":   agg_l3_ms,
    }


def request_sysinfo(gw: dict, retries: int = 5) -> dict:
    """Connect, send CMD_GET_SYS_INFO, return parsed sysinfo dict."""
    last_exc = None
    for attempt in range(retries):
        try:
            ws = WSClient(gw["host"], gw["port"])
            try:
                ws.send(build_cmd(CMD_GET_SYS_INFO))
                frame = recv_until(ws, PKT_SYS_INFO, timeout=6)
                assert frame is not None, "No PKT_SYS_INFO received"
                return parse_sysinfo(frame["payload"])
            finally:
                ws.close()
        except Exception as e:
            last_exc = e
            time.sleep(1.0)
    raise last_exc


# ---------------------------------------------------------------------------
# Host reference values (read directly from /proc on the test runner)
# ---------------------------------------------------------------------------
def _read(path: str) -> str:
    with open(path) as f:
        return f.read().strip()


HOST_HOSTNAME  = _read("/proc/sys/kernel/hostname")
HOST_OSTYPE    = _read("/proc/sys/kernel/ostype")
HOST_OSRELEASE = _read("/proc/sys/kernel/osrelease")
HOST_OS_TYPE   = f"{HOST_OSTYPE} {HOST_OSRELEASE}"


# ---------------------------------------------------------------------------
# Docker fixture
# ---------------------------------------------------------------------------
ROOT      = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
CONF_TEST = os.path.join(ROOT, "tests/tinytrack.conf-test")
DOCKER_GW_PORT = int(os.environ.get("TINYTRACK_DOCKER_PORT", 14030))


def _wait_port(host, port, timeout=15.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.3):
                return True
        except OSError:
            time.sleep(0.2)
    return False


@pytest.fixture(scope="module")
def gateway_docker():
    """
    Build (if needed) and run the tinytrack Docker image with host /proc and /
    bind-mounted. Yields gateway dict compatible with the host fixture.

    Skipped automatically if Docker is not available or image build fails.
    """
    # Check docker availability
    r = subprocess.run(["docker", "info"], capture_output=True)
    if r.returncode != 0:
        pytest.skip("Docker not available")

    image = "tinytrack-test:latest"
    build = subprocess.run(
        ["docker", "build", "-t", image, ROOT],
        capture_output=True, text=True,
    )
    if build.returncode != 0:
        pytest.skip(f"Docker build failed:\n{build.stderr[-800:]}")

    container_name = "tinytrack-sysinfo-test"
    subprocess.run(["docker", "rm", "-f", container_name],
                   capture_output=True)

    proc = subprocess.Popen([
        "docker", "run", "--rm",
        "--name", container_name,
        "-v", "/proc:/host/proc:ro",
        "-v", "/:/host/rootfs:ro",
        "-v", "/dev/shm:/dev/shm",
        "-p", f"{DOCKER_GW_PORT}:25015",
        "-e", "TT_PROC_ROOT=/host/proc",
        "-e", "TT_ROOTFS_PATH=/host/rootfs",
        image,
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

    if not _wait_port("127.0.0.1", DOCKER_GW_PORT, timeout=20):
        proc.terminate()
        out, _ = proc.communicate(timeout=5)
        pytest.skip(f"Docker container did not start in time.\n{out.decode(errors='replace')[-600:]}")

    yield {"host": "127.0.0.1", "port": DOCKER_GW_PORT}

    subprocess.run(["docker", "stop", container_name], capture_output=True)
    proc.wait(timeout=10)


# ---------------------------------------------------------------------------
# Shared assertions
# ---------------------------------------------------------------------------
def assert_sysinfo_reflects_host(info: dict, source: str):
    """Assert that sysinfo fields match the host system."""
    print(f"\n[{source}] sysinfo = {info}")

    assert info["hostname"], f"[{source}] hostname is empty"
    # In Docker, /proc/sys/kernel/hostname reflects the container's UTS namespace,
    # not the host — even with bind-mounted /proc. Only check on host.
    if source == "host":
        assert info["hostname"] == HOST_HOSTNAME, (
            f"[{source}] hostname mismatch: got={info['hostname']!r} "
            f"expected={HOST_HOSTNAME!r}"
        )

    assert info["os_type"], f"[{source}] os_type is empty"
    assert info["os_type"] == HOST_OS_TYPE, (
        f"[{source}] os_type mismatch: got={info['os_type']!r} "
        f"expected={HOST_OS_TYPE!r}"
    )

    assert info["uptime_sec"] > 0, f"[{source}] uptime_sec is 0"
    host_uptime = float(_read("/proc/uptime").split()[0])
    assert abs(info["uptime_sec"] - host_uptime) < 60, (
        f"[{source}] uptime too far off: got={info['uptime_sec']} "
        f"host={host_uptime:.0f}"
    )

    assert info["slots_l1"] > 0, f"[{source}] slots_l1 is 0"
    assert info["slots_l2"] > 0, f"[{source}] slots_l2 is 0"
    assert info["slots_l3"] > 0, f"[{source}] slots_l3 is 0"

    assert info["interval_ms"] > 0,  f"[{source}] interval_ms is 0"
    assert info["agg_l2_ms"]   > 0,  f"[{source}] agg_l2_ms is 0"
    assert info["agg_l3_ms"]   > 0,  f"[{source}] agg_l3_ms is 0"
    assert info["agg_l2_ms"] < info["agg_l3_ms"], (
        f"[{source}] agg_l2_ms ({info['agg_l2_ms']}) >= agg_l3_ms ({info['agg_l3_ms']})"
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
def test_sysinfo_host(gateway):
    """Gateway running on the host returns correct host sysinfo."""
    info = request_sysinfo(gateway)
    assert_sysinfo_reflects_host(info, "host")


def test_sysinfo_docker(gateway_docker):
    """Gateway running in Docker with bind-mounted /proc returns host sysinfo."""
    info = request_sysinfo(gateway_docker)
    assert_sysinfo_reflects_host(info, "docker")


def test_sysinfo_intervals_match_config(gateway):
    """interval_ms and agg intervals match the test config values."""
    import configparser
    cfg = configparser.ConfigParser()
    cfg.read(CONF_TEST)

    expected_interval = int(cfg.get("collection", "interval_ms", fallback=1000))
    expected_l2 = int(cfg.get("ringbuffer", "l2_agg_interval_sec", fallback=60)) * 1000
    expected_l3 = int(cfg.get("ringbuffer", "l3_agg_interval_sec", fallback=3600)) * 1000

    info = request_sysinfo(gateway)
    assert info["interval_ms"] == expected_interval, (
        f"interval_ms: got={info['interval_ms']} expected={expected_interval}"
    )
    assert info["agg_l2_ms"] == expected_l2, (
        f"agg_l2_ms: got={info['agg_l2_ms']} expected={expected_l2}"
    )
    assert info["agg_l3_ms"] == expected_l3, (
        f"agg_l3_ms: got={info['agg_l3_ms']} expected={expected_l3}"
    )
