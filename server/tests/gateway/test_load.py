"""
test_load.py — Load / concurrency tests for the gateway.

Goals:
  - epoll handles thousands of concurrent connections
  - no FD leaks under load
  - response time stays within bounds
  - gateway stays alive after load

Thresholds (conservative for 1-core VDS):
  - 200 concurrent WS connections
  - HTTP /api/metrics/live: p99 < 500 ms
"""
import os
import socket
import struct
import threading
import time

import pytest

from test_ws import (WSClient, PKT_CONFIG, PKT_METRICS, OP_BINARY,
                     build_cmd, CMD_GET_SNAPSHOT, recv_until, parse_frame)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fd_count(pid):
    import glob
    return len(glob.glob(f"/proc/{pid}/fd/*"))


def _gw_pid():
    import subprocess
    r = subprocess.run(["pgrep", "-x", "tinytrack"], capture_output=True, text=True)
    pids = r.stdout.strip().split()
    return pids[0] if pids else None


# ---------------------------------------------------------------------------
# HTTP load
# ---------------------------------------------------------------------------

def _http_get_time(host, port, path="/api/metrics/live"):
    t0 = time.monotonic()
    with socket.create_connection((host, port), timeout=10) as s:
        s.sendall(f"GET {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n".encode())
        data = b""
        s.settimeout(10)
        while True:
            chunk = s.recv(4096)
            if not chunk:
                break
            data += chunk
            if b"\r\n\r\n" in data:
                break
    elapsed = time.monotonic() - t0
    # Parse status from first line: "HTTP/1.1 200 OK"
    first_line = data.split(b"\r\n")[0] if data else b""
    parts = first_line.split(b" ")
    status = int(parts[1]) if len(parts) >= 2 and parts[1].isdigit() else 0
    return status, elapsed


def test_http_sequential_100(gateway):
    """100 sequential HTTP requests — all 200, p99 < 500 ms."""
    times = []
    for _ in range(100):
        status, t = _http_get_time(gateway["host"], gateway["port"])
        assert status == 200
        times.append(t)
    times.sort()
    p99 = times[int(len(times) * 0.99)]
    assert p99 < 0.5, f"HTTP p99 = {p99*1000:.0f} ms (limit 500 ms)"


def test_http_concurrent_50(gateway):
    """50 concurrent HTTP requests — all succeed."""
    results = []
    lock = threading.Lock()

    def worker():
        for _ in range(3):  # retry on transient ECONNRESET
            try:
                status, _ = _http_get_time(gateway["host"], gateway["port"])
                with lock:
                    results.append(status)
                return
            except ConnectionResetError:
                time.sleep(0.05)

    threads = [threading.Thread(target=worker) for _ in range(50)]
    for t in threads: t.start()
    for t in threads: t.join(timeout=15)

    assert len(results) == 50
    assert all(s == 200 for s in results), f"failures: {[s for s in results if s != 200]}"


# ---------------------------------------------------------------------------
# WebSocket concurrency
# ---------------------------------------------------------------------------

def test_ws_concurrent_connections(gateway):
    """Open 200 WS connections simultaneously, each receives PKT_CONFIG."""
    N = 200
    results = [None] * N
    lock = threading.Lock()

    def worker(i):
        try:
            ws = WSClient(gateway["host"], gateway["port"], timeout=8.0)
            frame = recv_until(ws, PKT_METRICS, timeout=5.0)
            ws.close()
            with lock:
                results[i] = frame is not None
        except Exception as e:
            with lock:
                results[i] = False

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(N)]
    for t in threads: t.start()
    for t in threads: t.join(timeout=15)

    success = sum(1 for r in results if r)
    # Allow up to 5% failure (OS resource limits on CI)
    assert success >= N * 0.95, f"only {success}/{N} connections got PKT_METRICS"


def test_ws_no_fd_leak_under_load(gateway):
    """After 100 connect/disconnect cycles, FD count returns to baseline."""
    pid = _gw_pid()
    if not pid:
        pytest.skip("tinytrack PID not found")

    baseline = _fd_count(pid)

    for _ in range(100):
        ws = WSClient(gateway["host"], gateway["port"], timeout=3.0)
        recv_until(ws, PKT_METRICS, timeout=2.0)
        ws.close()

    time.sleep(0.5)
    after = _fd_count(pid)
    leaked = after - baseline
    assert leaked <= 5, f"FD leak under load: {leaked} extra FDs"


def test_ws_throughput(gateway):
    """Single connection: receive at least 3 pushed PKT_METRICS in 5 seconds."""
    ws = WSClient(gateway["host"], gateway["port"], timeout=10.0)
    first = recv_until(ws, PKT_METRICS, timeout=10.0)
    assert first is not None, "no initial PKT_METRICS received"

    count = 0
    deadline = time.time() + 5.0
    while time.time() < deadline:
        ws._sock.settimeout(max(0.1, deadline - time.time()))
        try:
            op, data = ws.recv_frame()
            if op == OP_BINARY:
                frame = parse_frame(data)
                if frame and frame["type"] == PKT_METRICS:
                    count += 1
        except socket.timeout:
            break

    ws.close()
    assert count >= 3, f"only {count} PKT_METRICS in 5s (expected ≥3)"


# ---------------------------------------------------------------------------
# Slow client (back-pressure)
# ---------------------------------------------------------------------------

def test_slow_client_does_not_block_others(gateway):
    """A slow client that never reads should not block a fast client."""
    # Slow client: connect but never read
    slow = socket.create_connection((gateway["host"], gateway["port"]), timeout=3)

    # Fast client should still work
    ws = WSClient(gateway["host"], gateway["port"], timeout=5.0)
    frame = recv_until(ws, PKT_METRICS, timeout=3.0)
    ws.close()
    slow.close()

    assert frame is not None, "fast client blocked by slow client"


# ---------------------------------------------------------------------------
# Block E: load / stability additions
# ---------------------------------------------------------------------------

def _ws_handshake_raw(host, port, timeout=5.0):
    """Return a connected raw socket after WS handshake."""
    import base64, hashlib, os as _os
    s = socket.create_connection((host, port), timeout=timeout)
    key = base64.b64encode(_os.urandom(16)).decode()
    req = (
        f"GET /websocket HTTP/1.1\r\nHost: {host}:{port}\r\n"
        "Upgrade: websocket\r\nConnection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
    )
    s.sendall(req.encode())
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += s.recv(1024)
    assert b"101" in resp.split(b"\r\n")[0]
    return s


def test_ws_max_connections(gateway):
    """128 simultaneous WS connections — server must not crash."""
    host, port = gateway["host"], gateway["port"]
    conns = []
    try:
        for _ in range(128):
            try:
                conns.append(_ws_handshake_raw(host, port))
            except OSError:
                break  # OS limit reached — acceptable
        assert len(conns) >= 64, f"only {len(conns)} connections accepted"
    finally:
        for c in conns:
            try:
                c.close()
            except Exception:
                pass
    time.sleep(0.5)
    # Server must still respond
    ws = WSClient(host, port, timeout=5.0)
    frame = recv_until(ws, PKT_METRICS, timeout=3.0)
    ws.close()
    assert frame is not None, "server unresponsive after 128 connections"


def test_ws_rapid_reconnect(gateway):
    """100 connect/disconnect cycles — no FD leak."""
    host, port = gateway["host"], gateway["port"]

    result = __import__("subprocess").run(
        ["pgrep", "-x", "tinytrack"], capture_output=True, text=True
    )
    if not result.stdout.strip():
        pytest.skip("tinytrack process not found")
    pid = result.stdout.strip().split()[0]

    before = _fd_count(pid)
    for _ in range(100):
        try:
            s = _ws_handshake_raw(host, port, timeout=2.0)
            s.close()
        except OSError:
            pass
    time.sleep(0.5)
    after = _fd_count(pid)
    leaked = after - before
    assert leaked <= 4, f"FD leak: {leaked} after 100 rapid reconnects"


def test_http_slowloris_concurrent(gateway):
    """20 slowloris connections must not prevent a normal HTTP request."""
    host, port = gateway["host"], gateway["port"]

    slow_socks = []
    for _ in range(20):
        try:
            s = socket.create_connection((host, port), timeout=2.0)
            s.sendall(b"GET / HTTP/1.1\r\nHost: localhost\r\n")
            # deliberately do NOT send the final \r\n
            slow_socks.append(s)
        except OSError:
            break

    # Normal request must still succeed
    try:
        with socket.create_connection((host, port), timeout=5.0) as s:
            s.sendall(b"GET /api/metrics/live HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
            s.settimeout(5.0)
            resp = b""
            while True:
                chunk = s.recv(4096)
                if not chunk:
                    break
                resp += chunk
        ok = b"200" in resp.split(b"\r\n")[0] if resp else False
    except OSError:
        ok = False
    finally:
        for s in slow_socks:
            try:
                s.close()
            except Exception:
                pass

    assert ok, "normal HTTP request failed while slowloris connections were open"
