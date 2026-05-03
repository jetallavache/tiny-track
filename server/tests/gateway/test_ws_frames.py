"""
test_ws_frames.py — WS frame-level edge-case tests (roadmap §7 Блок C).

Uses a raw WS client that can send intentionally malformed frames.
"""
import base64
import hashlib
import os
import socket
import struct
import time

import pytest

WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
OP_CONTINUATION = 0x0
OP_TEXT         = 0x1
OP_BINARY       = 0x2
OP_CLOSE        = 0x8
OP_PING         = 0x9
OP_PONG         = 0xA

TIMEOUT = 4.0


# ---------------------------------------------------------------------------
# Raw WS helper — handshake only, then manual frame construction
# ---------------------------------------------------------------------------

class RawWS:
    def __init__(self, host, port, timeout=TIMEOUT):
        self.s = socket.create_connection((host, port), timeout=timeout)
        self.s.settimeout(timeout)
        self._handshake(host, port)

    def _handshake(self, host, port):
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f"GET /websocket HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "\r\n"
        )
        self.s.sendall(req.encode())
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self.s.recv(1024)
        assert b"101" in resp.split(b"\r\n")[0], f"handshake failed: {resp[:80]}"

    def send_raw(self, data: bytes):
        self.s.sendall(data)

    def send_frame(self, payload: bytes, opcode=OP_BINARY, fin=True,
                   masked=True, mask_key=None):
        """Build and send a WS frame."""
        b0 = (0x80 if fin else 0x00) | opcode
        length = len(payload)
        if mask_key is None:
            mask_key = os.urandom(4)
        masked_bit = 0x80 if masked else 0x00

        if length < 126:
            header = struct.pack("BB", b0, masked_bit | length)
        elif length < 65536:
            header = struct.pack("!BBH", b0, masked_bit | 126, length)
        else:
            header = struct.pack("!BBQ", b0, masked_bit | 127, length)

        if masked:
            body = mask_key + bytes(b ^ mask_key[i % 4] for i, b in enumerate(payload))
        else:
            body = payload
        self.s.sendall(header + body)

    def recv_frame(self, timeout=TIMEOUT):
        """Returns (opcode, payload) or raises socket.timeout / ConnectionError."""
        def read_exact(n):
            buf = b""
            while len(buf) < n:
                chunk = self.s.recv(n - len(buf))
                if not chunk:
                    raise ConnectionError("closed")
                buf += chunk
            return buf

        b0, b1 = struct.unpack("BB", read_exact(2))
        opcode = b0 & 0x0F
        masked = bool(b1 & 0x80)
        length = b1 & 0x7F
        if length == 126:
            length = struct.unpack("!H", read_exact(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", read_exact(8))[0]
        mask_key = read_exact(4) if masked else b""
        payload = read_exact(length)
        if masked:
            payload = bytes(b ^ mask_key[i % 4] for i, b in enumerate(payload))
        return opcode, payload

    def recv_until_opcode(self, opcode, timeout=TIMEOUT):
        deadline = time.time() + timeout
        while time.time() < deadline:
            self.s.settimeout(deadline - time.time())
            try:
                op, payload = self.recv_frame()
                if op == opcode:
                    return op, payload
            except socket.timeout:
                break
        return None, None

    def close(self):
        try:
            self.s.close()
        except Exception:
            pass


def server_alive(host, port) -> bool:
    try:
        with socket.create_connection((host, port), timeout=2.0):
            return True
    except OSError:
        return False


# ---------------------------------------------------------------------------
# C1: unknown opcode → server closes connection
# ---------------------------------------------------------------------------

def test_ws_unknown_opcode(gateway):
    host, port = gateway["host"], gateway["port"]
    ws = RawWS(host, port)
    ws.send_frame(b"hello", opcode=0x03)  # reserved, non-control
    # Server should close; recv should get CLOSE frame or ConnectionError
    closed = False
    try:
        op, _ = ws.recv_frame(timeout=3.0)
        closed = (op == OP_CLOSE)
    except (ConnectionError, ConnectionResetError, socket.timeout):
        closed = True
    ws.close()
    assert closed, "server did not close on unknown opcode"
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# C2: unmasked frame from client → server closes (RFC 6455 §5.3)
# ---------------------------------------------------------------------------

def test_ws_unmasked_frame(gateway):
    host, port = gateway["host"], gateway["port"]
    ws = RawWS(host, port)
    ws.send_frame(b"hello", opcode=OP_BINARY, masked=False)
    closed = False
    try:
        op, _ = ws.recv_frame(timeout=3.0)
        closed = (op == OP_CLOSE)
    except (ConnectionError, ConnectionResetError, socket.timeout):
        closed = True
    ws.close()
    assert closed, "server did not close on unmasked client frame"
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# C3: extended length 126 (2-byte)
# ---------------------------------------------------------------------------

def test_ws_extended_length_126(gateway):
    host, port = gateway["host"], gateway["port"]
    ws = RawWS(host, port)
    payload = b"x" * 200  # > 125, triggers 2-byte length
    ws.send_frame(payload, opcode=OP_BINARY)
    # Server should process it (no crash); we don't expect a specific response
    # Just verify server is still alive
    ws.close()
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# C4: extended length 127 (8-byte)
# ---------------------------------------------------------------------------

def test_ws_extended_length_127(gateway):
    host, port = gateway["host"], gateway["port"]
    ws = RawWS(host, port)
    payload = b"y" * 70000  # > 65535, triggers 8-byte length
    ws.send_frame(payload, opcode=OP_BINARY)
    ws.close()
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# C5: fragmented message (3 fragments)
# ---------------------------------------------------------------------------

def test_ws_fragmented_message(gateway):
    host, port = gateway["host"], gateway["port"]
    ws = RawWS(host, port)
    # Fragment 1: FIN=0, opcode=BINARY
    ws.send_frame(b"hel", opcode=OP_BINARY, fin=False)
    # Fragment 2: FIN=0, opcode=CONTINUATION
    ws.send_frame(b"lo ", opcode=OP_CONTINUATION, fin=False)
    # Fragment 3: FIN=1, opcode=CONTINUATION
    ws.send_frame(b"world", opcode=OP_CONTINUATION, fin=True)
    ws.close()
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# C6: PING → PONG with same payload
# ---------------------------------------------------------------------------

def test_ws_ping_pong(gateway):
    host, port = gateway["host"], gateway["port"]
    ws = RawWS(host, port)
    # Drain the initial PKT_METRICS push so recv buffer is clean
    ws.recv_until_opcode(OP_BINARY, timeout=3.0)
    ping_data = b"keepalive"
    ws.send_frame(ping_data, opcode=OP_PING)
    op, payload = ws.recv_until_opcode(OP_PONG, timeout=4.0)
    ws.close()
    assert op == OP_PONG, "no PONG received"
    assert payload == ping_data, f"PONG payload mismatch: {payload!r}"


# ---------------------------------------------------------------------------
# C7: CLOSE handshake — server echoes CLOSE
# ---------------------------------------------------------------------------

def test_ws_close_handshake(gateway):
    host, port = gateway["host"], gateway["port"]
    ws = RawWS(host, port)
    ws.send_frame(b"", opcode=OP_CLOSE)
    op, _ = ws.recv_until_opcode(OP_CLOSE, timeout=4.0)
    ws.close()
    assert op == OP_CLOSE, "server did not echo CLOSE frame"


# ---------------------------------------------------------------------------
# C8: CLOSE with status code 1001
# ---------------------------------------------------------------------------

def test_ws_close_with_code(gateway):
    host, port = gateway["host"], gateway["port"]
    ws = RawWS(host, port)
    ws.send_frame(struct.pack("!H", 1001), opcode=OP_CLOSE)
    op, _ = ws.recv_until_opcode(OP_CLOSE, timeout=4.0)
    ws.close()
    assert op == OP_CLOSE, "server did not respond to CLOSE with code"


# ---------------------------------------------------------------------------
# C9: oversized frame (claimed > 1 GiB) — server must not crash
# ---------------------------------------------------------------------------

def test_ws_oversized_frame(gateway):
    host, port = gateway["host"], gateway["port"]
    ws = RawWS(host, port)
    # Build a frame header claiming 2 GiB payload but send no actual data
    mask_key = os.urandom(4)
    header = struct.pack("!BB", 0x82, 0xFF)  # FIN+BINARY, 8-byte length
    header += struct.pack("!Q", 2 * 1024 * 1024 * 1024)  # 2 GiB
    header += mask_key
    ws.send_raw(header)
    # Server should close or timeout, not crash.
    # Drain any initial push frames (e.g. PKT_CONFIG) before checking for close.
    closed = False
    deadline = time.time() + 3.0
    try:
        while time.time() < deadline:
            ws.s.settimeout(deadline - time.time())
            op, _ = ws.recv_frame(timeout=deadline - time.time())
            if op == OP_CLOSE:
                closed = True
                break
    except (ConnectionError, ConnectionResetError, socket.timeout):
        closed = True
    ws.close()
    assert closed, "server did not close on oversized frame"
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# C10: mid-frame TCP disconnect
# ---------------------------------------------------------------------------

def test_ws_mid_frame_disconnect(gateway):
    host, port = gateway["host"], gateway["port"]
    ws = RawWS(host, port)
    # Send frame header claiming 1000 bytes, then close TCP immediately
    mask_key = os.urandom(4)
    header = struct.pack("BB", 0x82, 0x80 | 126)  # FIN+BINARY, 2-byte length
    header += struct.pack("!H", 1000)
    header += mask_key
    ws.send_raw(header)
    # Abruptly close without sending payload
    ws.s.close()
    time.sleep(0.2)
    assert server_alive(host, port)


# ---------------------------------------------------------------------------
# C11: garbage bytes after handshake
# ---------------------------------------------------------------------------

def test_ws_garbage_after_handshake(gateway):
    host, port = gateway["host"], gateway["port"]
    ws = RawWS(host, port)
    ws.send_raw(bytes(range(256)))
    closed = False
    try:
        op, _ = ws.recv_frame(timeout=3.0)
        closed = (op == OP_CLOSE)
    except (ConnectionError, ConnectionResetError, socket.timeout):
        closed = True
    ws.close()
    assert closed, "server did not close on garbage input"
    assert server_alive(host, port)
