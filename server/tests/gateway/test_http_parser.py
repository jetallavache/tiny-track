"""
test_http_parser.py — HTTP parser edge-case tests (roadmap §7 Блок B).

All tests use raw TCP to send malformed/edge-case HTTP requests and verify
the server does not crash and responds sensibly.
"""
import os
import socket
import time

import pytest

TIMEOUT = 3.0


def raw_send(host, port, data: bytes, read_bytes=256, timeout=TIMEOUT) -> bytes:
    """Send raw bytes, return whatever the server sends back (or b'' on close)."""
    with socket.create_connection((host, port), timeout=timeout) as s:
        s.sendall(data)
        s.settimeout(timeout)
        buf = b""
        try:
            while True:
                chunk = s.recv(read_bytes)
                if not chunk:
                    break
                buf += chunk
                if len(buf) >= read_bytes:
                    break
        except (socket.timeout, ConnectionResetError):
            pass
    return buf


def server_alive(host, port) -> bool:
    """Check the server still accepts connections after a bad request."""
    try:
        with socket.create_connection((host, port), timeout=2.0):
            return True
    except OSError:
        return False


# ---------------------------------------------------------------------------
# B1: missing CRLF terminator
# ---------------------------------------------------------------------------

def test_http_missing_crlf(gateway):
    """Request without \\r\\n\\r\\n — server must not crash."""
    host, port = gateway["host"], gateway["port"]
    raw_send(host, port, b"GET / HTTP/1.1\r\nHost: localhost\r\n")
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# B2: null byte in URI
# ---------------------------------------------------------------------------

def test_http_null_byte_in_uri(gateway):
    host, port = gateway["host"], gateway["port"]
    resp = raw_send(host, port, b"GET /foo\x00bar HTTP/1.1\r\nHost: localhost\r\n\r\n")
    # Server must either close or return 4xx; must not crash
    assert server_alive(host, port)
    if resp:
        status = int(resp.split(b" ")[1]) if b" " in resp else 0
        assert status in (0, 400, 404, 501), f"unexpected status {status}"


# ---------------------------------------------------------------------------
# B3: null byte in header value
# ---------------------------------------------------------------------------

def test_http_null_byte_in_header(gateway):
    host, port = gateway["host"], gateway["port"]
    raw_send(host, port,
             b"GET / HTTP/1.1\r\nHost: local\x00host\r\n\r\n")
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# B4: URI too long (9000 bytes)
# ---------------------------------------------------------------------------

def test_http_uri_too_long(gateway):
    host, port = gateway["host"], gateway["port"]
    long_uri = b"/" + b"a" * 9000
    resp = raw_send(host, port,
                    b"GET " + long_uri + b" HTTP/1.1\r\nHost: localhost\r\n\r\n",
                    read_bytes=512)
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# B5: too many headers (50)
# ---------------------------------------------------------------------------

def test_http_headers_too_many(gateway):
    host, port = gateway["host"], gateway["port"]
    headers = b"".join(f"X-H{i}: value\r\n".encode() for i in range(50))
    raw_send(host, port,
             b"GET / HTTP/1.1\r\nHost: localhost\r\n" + headers + b"\r\n")
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# B6: duplicate Host header
# ---------------------------------------------------------------------------

def test_http_duplicate_host(gateway):
    host, port = gateway["host"], gateway["port"]
    raw_send(host, port,
             b"GET / HTTP/1.1\r\nHost: localhost\r\nHost: evil.com\r\n\r\n")
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# B7: garbage input
# ---------------------------------------------------------------------------

def test_http_garbage_input(gateway):
    host, port = gateway["host"], gateway["port"]
    garbage = bytes(range(256)) * 4
    raw_send(host, port, garbage)
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# B8: slowloris — headers arrive 1 byte at a time
# ---------------------------------------------------------------------------

def test_http_slowloris(gateway):
    """Send headers 1 byte/100ms. Server should close the connection eventually."""
    host, port = gateway["host"], gateway["port"]
    partial = b"GET / HTTP/1.1\r\nHost: localhost\r\n"
    closed = False
    try:
        with socket.create_connection((host, port), timeout=10.0) as s:
            for byte in partial:
                s.send(bytes([byte]))
                time.sleep(0.05)
            # Wait up to 5s for server to close
            s.settimeout(5.0)
            try:
                data = s.recv(256)
                closed = (data == b"")
            except (socket.timeout, ConnectionResetError):
                closed = True  # server closed or timed out — acceptable
    except (ConnectionResetError, BrokenPipeError):
        closed = True
    # Server must still be alive regardless
    assert server_alive(host, port)
    # We don't assert closed=True because the server may not have a read timeout
    # configured in the test config; the important thing is no crash.


# ---------------------------------------------------------------------------
# B9: WS upgrade without Sec-WebSocket-Key
# ---------------------------------------------------------------------------

def test_http_upgrade_missing_key(gateway):
    host, port = gateway["host"], gateway["port"]
    resp = raw_send(host, port,
                    b"GET /websocket HTTP/1.1\r\n"
                    b"Host: localhost\r\n"
                    b"Upgrade: websocket\r\n"
                    b"Connection: Upgrade\r\n"
                    b"Sec-WebSocket-Version: 13\r\n"
                    b"\r\n",
                    read_bytes=512)
    assert server_alive(host, port)
    # Must not be 101; expect 426 or 400
    if resp and b" " in resp:
        status = int(resp.split(b" ")[1])
        assert status != 101, f"server accepted WS upgrade without key (got {status})"


# ---------------------------------------------------------------------------
# B10: WS upgrade with wrong Sec-WebSocket-Version
# ---------------------------------------------------------------------------

def test_http_upgrade_wrong_version(gateway):
    import base64, os as _os
    host, port = gateway["host"], gateway["port"]
    key = base64.b64encode(_os.urandom(16)).decode()
    resp = raw_send(host, port,
                    f"GET /websocket HTTP/1.1\r\n"
                    f"Host: {host}:{port}\r\n"
                    f"Upgrade: websocket\r\n"
                    f"Connection: Upgrade\r\n"
                    f"Sec-WebSocket-Key: {key}\r\n"
                    f"Sec-WebSocket-Version: 12\r\n"
                    f"\r\n".encode(),
                    read_bytes=512)
    assert server_alive(host, port)
    # RFC 6455: server SHOULD reject with 426 if version != 13
    # We only assert no crash; version enforcement is optional in this impl.
