"""
test_http.py — HTTP API tests for tinytrack gateway.

Endpoints:
  GET /api/metrics/live  → 200 JSON
  GET /websocket         → 101 Upgrade (not a plain HTTP response)
  GET /nonexistent       → 404
"""
import json
import socket

import pytest


def http_get(host, port, path, timeout=5.0):
    """Minimal HTTP GET. Returns (status_code, headers_str, body_bytes)."""
    with socket.create_connection((host, port), timeout=timeout) as s:
        req = f"GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\nConnection: close\r\n\r\n"
        s.sendall(req.encode())
        raw = b""
        while b"\r\n\r\n" not in raw:
            chunk = s.recv(4096)
            if not chunk:
                break
            raw += chunk

    header_end = raw.find(b"\r\n\r\n")
    if header_end == -1:
        return None, raw.decode(errors="replace"), b""
    headers = raw[:header_end].decode(errors="replace")
    body = raw[header_end + 4:]

    # Read remaining body bytes up to Content-Length
    import re
    m = re.search(r"Content-Length:\s*(\d+)", headers, re.IGNORECASE)
    if m:
        content_length = int(m.group(1))
        with socket.create_connection((host, port), timeout=timeout) as s2:
            s2.sendall(req.encode())
            full = b""
            while b"\r\n\r\n" not in full:
                full += s2.recv(4096)
            hdr_end = full.find(b"\r\n\r\n")
            body_start = full[hdr_end + 4:]
            while len(body_start) < content_length:
                chunk = s2.recv(4096)
                if not chunk:
                    break
                body_start += chunk
            headers = full[:hdr_end].decode(errors="replace")
            body = body_start[:content_length]

    status = int(headers.split(" ")[1])
    return status, headers, body


# ---------------------------------------------------------------------------

def test_metrics_live_200(gateway):
    status, _, body = http_get(gateway["host"], gateway["port"], "/api/metrics/live")
    assert status == 200, f"expected 200, got {status}"


def test_metrics_live_json(gateway):
    _, _, body = http_get(gateway["host"], gateway["port"], "/api/metrics/live")
    data = json.loads(body.decode())
    assert "cpu" in data
    assert "mem" in data
    assert isinstance(data["cpu"], int)


def test_metrics_live_values_in_range(gateway):
    _, _, body = http_get(gateway["host"], gateway["port"], "/api/metrics/live")
    data = json.loads(body.decode())
    assert 0 <= data["cpu"] <= 10000, f"cpu out of range: {data['cpu']}"
    assert 0 <= data["mem"] <= 10000, f"mem out of range: {data['mem']}"


def test_not_found_404(gateway):
    status, _, _ = http_get(gateway["host"], gateway["port"], "/no/such/path")
    assert status == 404


def test_websocket_upgrade_101(gateway):
    """Raw HTTP upgrade request should get 101 Switching Protocols."""
    import base64, os
    key = base64.b64encode(os.urandom(16)).decode()
    with socket.create_connection((gateway["host"], gateway["port"]), timeout=5) as s:
        req = (
            "GET /websocket HTTP/1.1\r\n"
            f"Host: {gateway['host']}:{gateway['port']}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "\r\n"
        )
        s.sendall(req.encode())
        resp = s.recv(1024).decode(errors="replace")
    assert "101" in resp.split("\r\n")[0], f"expected 101, got: {resp[:80]}"
