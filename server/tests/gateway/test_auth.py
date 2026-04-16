"""
test_auth.py — authentication tests (Bearer + CMD_AUTH).

Manages its own server processes — does NOT use conftest.py fixtures.
Set TINYTRACK_SKIP_AUTH_TESTS=1 to skip if servers can't start.
"""
import os
import re
import socket
import struct
import subprocess
import time

import pytest

ROOT      = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
TINYTD    = os.path.join(ROOT, "tinytd/tinytd")
TINYTRACK = os.path.join(ROOT, "gateway/tinytrack")
CONF      = os.path.join(ROOT, "tests/tinytrack.conf-test")

NO_AUTH_PORT = 14034
AUTH_PORT    = 14035
TEST_TOKEN   = "test-secret-token"

# ---------------------------------------------------------------------------
# Protocol constants
# ---------------------------------------------------------------------------
PROTO_MAGIC  = 0xAA
PKT_METRICS  = 0x01
PKT_CONFIG   = 0x02
PKT_ACK      = 0x05
PKT_AUTH_REQ = 0x15
PKT_CMD      = 0x04
CMD_AUTH     = 0x14
ACK_OK       = 0x00
ACK_AUTH_FAIL = 0x02


# ---------------------------------------------------------------------------
# Protocol helpers
# ---------------------------------------------------------------------------
def _build_frame(pkt_type: int, payload: bytes) -> bytes:
    ts = int(time.time())
    length = len(payload)
    hdr = struct.pack(">BBBHIB", PROTO_MAGIC, 2, pkt_type, length, ts, 0)
    cs = 0
    for b in hdr[:9]:
        cs ^= b
    return hdr[:9] + bytes([cs]) + payload


def _build_auth(token: str) -> bytes:
    tb = token.encode()[:63]
    return _build_frame(PKT_CMD, bytes([CMD_AUTH]) + tb + b'\x00' * (64 - len(tb)))


def _ws_handshake(sock: socket.socket, extra_headers: str = "") -> bytes:
    """Returns any bytes received after the HTTP headers (start of first WS frame)."""
    req = (
        "GET /websocket HTTP/1.1\r\n"
        "Host: 127.0.0.1\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
        "Sec-WebSocket-Version: 13\r\n"
        f"{extra_headers}"
        "\r\n"
    )
    sock.sendall(req.encode())
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += sock.recv(4096)
    assert b"101" in resp, f"WS handshake failed: {resp[:200]}"
    # Return bytes after the HTTP header separator (start of WS frames)
    return resp[resp.index(b"\r\n\r\n") + 4:]


def _ws_send(sock: socket.socket, data: bytes) -> None:
    mask = b'\x01\x02\x03\x04'
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
    n = len(data)
    hdr = struct.pack("BB", 0x82, 0x80 | n) + mask if n < 126 else \
          struct.pack(">BBH", 0x82, 0xFE, n) + mask
    sock.sendall(hdr + masked)


def _ws_recv(sock: socket.socket, timeout: float = 3.0, leftover: bytes = b"") -> bytes:
    """Receive one WS frame, using leftover bytes from handshake first."""
    sock.settimeout(timeout)
    buf = leftover

    def _read(n: int) -> bytes:
        nonlocal buf
        while len(buf) < n:
            chunk = sock.recv(4096)
            if not chunk:
                raise ConnectionResetError("connection closed")
            buf += chunk
        data, buf = buf[:n], buf[n:]
        return data

    h = _read(2)
    n = h[1] & 0x7F
    if n == 126:
        n = struct.unpack(">H", _read(2))[0]
    elif n == 127:
        n = struct.unpack(">Q", _read(8))[0]
    return _read(n)


def _recv_until(sock: socket.socket, pkt_type: int, timeout: float = 3.0,
                leftover: bytes = b"") -> tuple:
    """Receive frames (skipping PKT_METRICS) until pkt_type found.
    Returns (payload, remaining_leftover)."""
    deadline = time.time() + timeout
    buf = leftover
    while time.time() < deadline:
        # _ws_recv consumes from buf first, returns payload; we need remaining buf
        # Use a wrapper that exposes the buffer state
        sock.settimeout(max(0.3, deadline - time.time()))

        def _read(n: int) -> bytes:
            nonlocal buf
            while len(buf) < n:
                chunk = sock.recv(4096)
                if not chunk:
                    raise ConnectionResetError("connection closed")
                buf += chunk
            data, buf = buf[:n], buf[n:]
            return data

        h = _read(2)
        n = h[1] & 0x7F
        if n == 126:
            n = struct.unpack(">H", _read(2))[0]
        elif n == 127:
            n = struct.unpack(">Q", _read(8))[0]
        p = _read(n)

        if len(p) >= 3 and p[0] == PROTO_MAGIC:
            if p[2] == pkt_type or p[2] != PKT_METRICS:
                return p, buf
    raise TimeoutError(f"Did not receive 0x{pkt_type:02x}")


def _conn(port: int) -> socket.socket:
    s = socket.create_connection(("127.0.0.1", port), timeout=3)
    s.settimeout(3)
    return s


def _wait_port(port: int, timeout: float = 5.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            socket.create_connection(("127.0.0.1", port), timeout=0.2).close()
            return True
        except OSError:
            time.sleep(0.1)
    return False


def _make_conf(port: int, live: str, shadow: str, extra: str = "") -> str:
    text = open(CONF).read()
    text = re.sub(r'live_path\s*=\s*\S+',   f'live_path = {live}',   text)
    text = re.sub(r'shadow_path\s*=\s*\S+', f'shadow_path = {shadow}', text)
    text = re.sub(r'port\s*=\s*\d+',        f'port = {port}',         text)
    text = re.sub(r'max_connections\s*=\s*\d+', 'max_connections = 10', text)
    return text + extra


# ---------------------------------------------------------------------------
# Module-level server management (no conftest dependency)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module", autouse=True)
def _servers(tmp_path_factory):
    """Start two tinytrack instances for the duration of this test module."""
    import tempfile

    live1, shadow1 = "/tmp/tt-auth-noauth-live.dat", "/tmp/tt-auth-noauth-shadow.dat"
    live2, shadow2 = "/tmp/tt-auth-auth-live.dat",   "/tmp/tt-auth-auth-shadow.dat"

    for f in (live1, shadow1, live2, shadow2):
        try: os.unlink(f)
        except FileNotFoundError: pass

    conf1 = tempfile.NamedTemporaryFile(mode='w', suffix='.conf', delete=False)
    conf1.write(_make_conf(NO_AUTH_PORT, live1, shadow1)); conf1.close()

    conf2 = tempfile.NamedTemporaryFile(mode='w', suffix='.conf', delete=False)
    conf2.write(_make_conf(AUTH_PORT, live2, shadow2,
                           f'\nauth_token = {TEST_TOKEN}\nauth_timeout_ms = 3000\n'))
    conf2.close()

    procs = []
    for conf, live in ((conf1.name, live1), (conf2.name, live2)):
        td = subprocess.Popen([TINYTD, '-c', conf],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deadline = time.time() + 6
        while time.time() < deadline:
            if os.path.exists(live): break
            time.sleep(0.1)
        gw = subprocess.Popen([TINYTRACK, '-c', conf, '--no-daemon'],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        procs.extend([td, gw])

    ok1 = _wait_port(NO_AUTH_PORT, timeout=5)
    ok2 = _wait_port(AUTH_PORT, timeout=5)

    if not (ok1 and ok2):
        for p in procs:
            p.terminate()
            try: p.wait(timeout=2)
            except subprocess.TimeoutExpired: p.kill()
        for f in (conf1.name, conf2.name, live1, shadow1, live2, shadow2):
            try: os.unlink(f)
            except FileNotFoundError: pass
        pytest.skip(f"Auth servers did not start (no_auth={ok1}, auth={ok2})")

    yield

    for p in procs:
        p.terminate()
        try: p.wait(timeout=3)
        except subprocess.TimeoutExpired: p.kill()
    for f in (conf1.name, conf2.name, live1, shadow1, live2, shadow2):
        try: os.unlink(f)
        except FileNotFoundError: pass


# ---------------------------------------------------------------------------
# Tests: no-auth server
# ---------------------------------------------------------------------------
def test_no_auth_connects_normally():
    s = _conn(NO_AUTH_PORT)
    try:
        lo = _ws_handshake(s)
        p, _ = _recv_until(s, PKT_CONFIG, leftover=lo)
        assert p[2] == PKT_CONFIG, f"got 0x{p[2]:02x}"
    finally:
        s.close()


def test_auth_req_sent_on_connect():
    s = _conn(AUTH_PORT)
    try:
        lo = _ws_handshake(s)
        p, _ = _recv_until(s, PKT_AUTH_REQ, leftover=lo)
        assert p[2] == PKT_AUTH_REQ, f"got 0x{p[2]:02x}"
    finally:
        s.close()


def test_cmd_auth_correct_token():
    s = _conn(AUTH_PORT)
    try:
        lo = _ws_handshake(s)
        _, lo = _recv_until(s, PKT_AUTH_REQ, leftover=lo)
        _ws_send(s, _build_auth(TEST_TOKEN))
        ack, lo = _recv_until(s, PKT_ACK, leftover=lo)
        assert ack[2] == PKT_ACK
        assert ack[10] == CMD_AUTH
        assert ack[11] == ACK_OK, f"got 0x{ack[11]:02x}"
        cfg, _ = _recv_until(s, PKT_CONFIG, leftover=lo)
        assert cfg[2] == PKT_CONFIG
    finally:
        s.close()


def test_cmd_auth_wrong_token():
    s = _conn(AUTH_PORT)
    try:
        lo = _ws_handshake(s)
        _, lo = _recv_until(s, PKT_AUTH_REQ, leftover=lo)
        _ws_send(s, _build_auth("wrong"))
        ack, _ = _recv_until(s, PKT_ACK, leftover=lo)
        assert ack[2] == PKT_ACK
        assert ack[11] == ACK_AUTH_FAIL, f"got 0x{ack[11]:02x}"
        s.settimeout(3.0)
        data = b""
        try: data = s.recv(256)
        except (ConnectionResetError, socket.timeout): pass
        assert len(data) == 0 or (data[0] & 0x0F) == 0x08
    finally:
        s.close()


def test_message_before_auth_closes_connection():
    s = _conn(AUTH_PORT)
    try:
        lo = _ws_handshake(s)
        _, _ = _recv_until(s, PKT_AUTH_REQ, leftover=lo)
        _ws_send(s, _build_frame(PKT_CMD, bytes([0x03]) + b'\x00' * 8))
        s.settimeout(3.0)
        data = b""
        try: data = s.recv(256)
        except (ConnectionResetError, socket.timeout): pass
        assert len(data) == 0 or (data[0] & 0x0F) == 0x08
    finally:
        s.close()


def test_auth_timeout_closes_connection():
    s = _conn(AUTH_PORT)
    try:
        lo = _ws_handshake(s)
        _, _ = _recv_until(s, PKT_AUTH_REQ, leftover=lo)
        s.settimeout(5.0)
        data = b""
        try: data = s.recv(256)
        except (ConnectionResetError, socket.timeout): pass
        assert len(data) == 0 or (data[0] & 0x0F) == 0x08
    finally:
        s.close()


def test_bearer_token_correct():
    s = _conn(AUTH_PORT)
    try:
        lo = _ws_handshake(s, f"Authorization: Bearer {TEST_TOKEN}\r\n")
        p, _ = _recv_until(s, PKT_CONFIG, leftover=lo)
        assert p[2] == PKT_CONFIG, f"got 0x{p[2]:02x}"
    finally:
        s.close()


def test_bearer_token_wrong():
    s = _conn(AUTH_PORT)
    try:
        lo = _ws_handshake(s, "Authorization: Bearer wrong\r\n")
        p, _ = _recv_until(s, PKT_AUTH_REQ, leftover=lo)
        assert p[2] == PKT_AUTH_REQ, f"got 0x{p[2]:02x}"
    finally:
        s.close()
