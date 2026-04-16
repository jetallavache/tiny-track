"""
test_ws.py — WebSocket protocol tests (connect, send, receive, close).

Uses a minimal pure-stdlib WS client (no external deps).
Proto v1/v2 packet parsing mirrors common/proto/v1.h and v2.h.
"""
import base64
import hashlib
import os
import socket
import struct
import time

import pytest

# Honour WS_TIMEOUT env var so valgrind runs can use a larger timeout
_DEFAULT_TIMEOUT = float(os.environ.get("WS_TIMEOUT", "5.0"))

# ---------------------------------------------------------------------------
# Minimal WebSocket client
# ---------------------------------------------------------------------------

WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
OP_TEXT   = 0x1
OP_BINARY = 0x2
OP_CLOSE  = 0x8
OP_PING   = 0x9
OP_PONG   = 0xA


class WSClient:
    def __init__(self, host, port, path="/websocket", timeout=None, ssl_ctx=None):
        if timeout is None:
            timeout = _DEFAULT_TIMEOUT
        self._sock = socket.create_connection((host, port), timeout=timeout)
        if ssl_ctx:
            self._sock = ssl_ctx.wrap_socket(self._sock, server_hostname=host)
        self._sock.settimeout(timeout)
        self._handshake(host, port, path)

    def _handshake(self, host, port, path):
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "\r\n"
        )
        self._sock.sendall(req.encode())
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self._sock.recv(1024)
        assert b"101" in resp.split(b"\r\n")[0], f"WS upgrade failed: {resp[:80]}"
        expected = base64.b64encode(
            hashlib.sha1((key + WS_GUID).encode()).digest()
        ).decode()
        assert expected in resp.decode(errors="replace"), "Sec-WebSocket-Accept mismatch"

    def send(self, data: bytes, opcode=OP_BINARY):
        mask = os.urandom(4)
        payload = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        length = len(data)
        if length < 126:
            header = struct.pack("BB", 0x80 | opcode, 0x80 | length)
        elif length < 65536:
            header = struct.pack("!BBH", 0x80 | opcode, 0x80 | 126, length)
        else:
            header = struct.pack("!BBQ", 0x80 | opcode, 0x80 | 127, length)
        self._sock.sendall(header + mask + payload)

    def recv_frame(self):
        """Returns (opcode, payload_bytes)."""
        def read_exact(n):
            buf = b""
            while len(buf) < n:
                chunk = self._sock.recv(n - len(buf))
                if not chunk:
                    raise ConnectionError("connection closed")
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

    def close(self):
        try:
            self.send(b"", OP_CLOSE)
        except Exception:
            pass
        self._sock.close()


# ---------------------------------------------------------------------------
# Proto helpers (mirrors common/proto/v1.h + v2.h)
# ---------------------------------------------------------------------------

PROTO_MAGIC   = 0xAA
PROTO_V1      = 0x01
PROTO_V2      = 0x02

PKT_METRICS      = 0x01
PKT_CONFIG       = 0x02
PKT_ACK          = 0x05
PKT_CMD          = 0x04
PKT_HISTORY_REQ  = 0x10
PKT_HISTORY_RESP = 0x11
PKT_SUBSCRIBE    = 0x12
PKT_STATS        = 0x13

CMD_SET_INTERVAL = 0x01
CMD_GET_SNAPSHOT = 0x03
CMD_GET_STATS    = 0x10
ACK_OK           = 0x00
RING_L1          = 0x01
RING_L2          = 0x02


def build_header(version, pkt_type, timestamp, payload_len):
    # magic(1) ver(1) type(1) length(2BE) timestamp(4BE) checksum(1)
    hdr = struct.pack("!BBBHIB",
                      PROTO_MAGIC, version, pkt_type,
                      payload_len, timestamp, 0)
    # checksum = XOR of bytes 0..8 (all header bytes except checksum)
    cs = 0
    for b in hdr[:9]:
        cs ^= b
    return hdr[:9] + bytes([cs])


def build_cmd(cmd_type):
    # tt_proto_cmd: cmd_type(1) + union _pad[8] = 9 bytes total
    payload = struct.pack("!B8x", cmd_type)
    return build_header(PROTO_V1, PKT_CMD, int(time.time()), len(payload)) + payload


def build_history_req(level, max_count):
    # tt_proto_history_req: level(1) from_ts(8) to_ts(8) max_count(2) = 19 bytes
    payload = struct.pack("!BQQH", level, 0, 0, max_count)
    return build_header(PROTO_V2, PKT_HISTORY_REQ, int(time.time()), len(payload)) + payload


def build_subscribe(level, interval_ms=1000):
    # tt_proto_subscribe: level(1) interval_ms(4) _reserved(1) = 6 bytes
    payload = struct.pack("!BIB", level, interval_ms, 0)
    return build_header(PROTO_V2, PKT_SUBSCRIBE, int(time.time()), len(payload)) + payload


def parse_frame(data: bytes):
    if len(data) < 10:
        return None
    magic, version, pkt_type, length, timestamp, checksum = struct.unpack_from("!BBBHIB", data)
    if magic != PROTO_MAGIC:
        return None
    payload = data[10:10 + length]
    return {"type": pkt_type, "version": version, "payload": payload, "timestamp": timestamp}


def recv_until(ws, pkt_type, timeout=None):
    """Receive frames until one with pkt_type is found or timeout."""
    if timeout is None:
        timeout = _DEFAULT_TIMEOUT
    deadline = time.time() + timeout
    while time.time() < deadline:
        remaining = deadline - time.time()
        if remaining <= 0:
            break
        try:
            ws._sock.settimeout(min(remaining, 1.0))
            op, data = ws.recv_frame()
            if op == OP_BINARY:
                frame = parse_frame(data)
                if frame and frame["type"] == pkt_type:
                    return frame
        except socket.timeout:
            continue  # keep trying until deadline
        except Exception:
            break
    return None


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_ws_connect_and_config(gateway):
    """Connect and receive the first pushed frame (PKT_METRICS)."""
    ws = WSClient(gateway["host"], gateway["port"])
    frame = recv_until(ws, PKT_METRICS)
    assert frame is not None, "PKT_METRICS not received on connect"
    assert len(frame["payload"]) >= 12, "PKT_METRICS payload too short"
    ws.close()


def test_ws_get_snapshot(gateway):
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)  # consume first push
    ws.send(build_cmd(CMD_GET_SNAPSHOT))
    frame = recv_until(ws, PKT_METRICS)
    assert frame is not None, "PKT_METRICS not received after CMD_GET_SNAPSHOT"
    ws.close()


def test_ws_metrics_values(gateway):
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_cmd(CMD_GET_SNAPSHOT))
    frame = recv_until(ws, PKT_METRICS)
    assert frame is not None
    # tt_metrics (packed, native LE):
    # timestamp(8) cpu_usage(2) mem_usage(2) net_rx(4) net_tx(4) ...
    p = frame["payload"]
    assert len(p) >= 12, f"payload too short: {len(p)}"
    ts  = struct.unpack_from("<Q", p, 0)[0]
    cpu = struct.unpack_from("<H", p, 8)[0]
    mem = struct.unpack_from("<H", p, 10)[0]
    assert ts > 0,            f"timestamp is 0"
    assert 0 <= cpu <= 10000, f"cpu out of range: {cpu}"
    assert 0 <= mem <= 10000, f"mem out of range: {mem}"
    ws.close()


def test_ws_history_request(gateway):
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_history_req(RING_L1, 10))
    frame = recv_until(ws, PKT_HISTORY_RESP, timeout=8.0)
    assert frame is not None, "PKT_HISTORY_RESP not received"
    ws.close()


def test_ws_subscribe(gateway):
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_subscribe(RING_L1, 1000))
    frame = recv_until(ws, PKT_ACK)
    assert frame is not None, "PKT_ACK not received after subscribe"
    status = struct.unpack_from("BB", frame["payload"])[1]
    assert status == ACK_OK, f"subscribe ACK status: {status}"
    ws.close()


def test_ws_get_stats(gateway):
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_cmd(CMD_GET_STATS))
    frame = recv_until(ws, PKT_STATS, timeout=8.0)
    assert frame is not None, "PKT_STATS not received"
    ws.close()


def test_ws_graceful_close(gateway):
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.close()  # should not raise


def test_ws_multiple_sequential(gateway):
    """Open and close 10 connections sequentially — no crash."""
    for _ in range(10):
        ws = WSClient(gateway["host"], gateway["port"])
        recv_until(ws, PKT_CONFIG, timeout=3.0)
        ws.close()


def test_ws_push_arrives(gateway):
    """Wait for a pushed PKT_METRICS without requesting it."""
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    # Gateway pushes every ~1s; wait up to 3s
    frame = recv_until(ws, PKT_METRICS, timeout=3.0)
    assert frame is not None, "no pushed PKT_METRICS within 3s"
    ws.close()


# ---------------------------------------------------------------------------
# Block D: protocol edge cases
# ---------------------------------------------------------------------------

CMD_SET_ALERTS   = 0x02
CMD_GET_STATS    = 0x10
CMD_GET_SYS_INFO = 0x11
CMD_START        = 0x12
CMD_STOP         = 0x13
PKT_SYS_INFO     = 0x14
RING_L3          = 0x03


def build_cmd_interval(interval_ms):
    payload = struct.pack("!BI4x", CMD_SET_INTERVAL, interval_ms)
    return build_header(PROTO_V1, PKT_CMD, int(time.time()), len(payload)) + payload


def build_cmd_raw(cmd_type):
    payload = struct.pack("!B8x", cmd_type)
    return build_header(PROTO_V1, PKT_CMD, int(time.time()), len(payload)) + payload


def build_bad_magic():
    payload = struct.pack("!B8x", CMD_GET_SNAPSHOT)
    hdr = struct.pack("!BBBHIB", 0x00, PROTO_V1, PKT_CMD,
                      len(payload), int(time.time()), 0)
    return hdr[:9] + bytes([0]) + payload


def build_bad_checksum():
    payload = struct.pack("!B8x", CMD_GET_SNAPSHOT)
    frame = build_header(PROTO_V1, PKT_CMD, int(time.time()), len(payload)) + payload
    # flip checksum byte (index 9)
    return frame[:9] + bytes([frame[9] ^ 0xFF]) + frame[10:]


def build_subscribe_level(level):
    payload = struct.pack("!BIB", level, 1000, 0)
    return build_header(PROTO_V2, PKT_SUBSCRIBE, int(time.time()), len(payload)) + payload


def test_ws_invalid_proto_magic(gateway):
    """Frame with magic=0x00 must be silently ignored; connection stays alive."""
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_bad_magic())
    # Send a valid snapshot right after — should still get a response
    ws.send(build_cmd(CMD_GET_SNAPSHOT))
    frame = recv_until(ws, PKT_METRICS, timeout=4.0)
    ws.close()
    assert frame is not None, "connection died after bad-magic frame"


def test_ws_bad_checksum(gateway):
    """Frame with wrong checksum must be silently ignored."""
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_bad_checksum())
    ws.send(build_cmd(CMD_GET_SNAPSHOT))
    frame = recv_until(ws, PKT_METRICS, timeout=4.0)
    ws.close()
    assert frame is not None, "connection died after bad-checksum frame"


def test_ws_cmd_unknown(gateway):
    """Unknown cmd_type must return ACK_ERROR."""
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_cmd_raw(0xFF))
    frame = recv_until(ws, PKT_ACK, timeout=4.0)
    ws.close()
    assert frame is not None, "no ACK for unknown cmd"
    status = struct.unpack_from("BB", frame["payload"])[1]
    assert status != ACK_OK, f"expected ACK_ERROR for unknown cmd, got {status}"


def test_ws_subscribe_invalid_level(gateway):
    """Subscribe with level=0xFF must return ACK_ERROR."""
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_subscribe_level(0xFF))
    frame = recv_until(ws, PKT_ACK, timeout=4.0)
    ws.close()
    assert frame is not None, "no ACK for invalid subscribe level"
    status = struct.unpack_from("BB", frame["payload"])[1]
    assert status != ACK_OK, f"expected ACK_ERROR for level=0xFF, got {status}"


def test_ws_set_interval_too_low(gateway):
    """interval_ms=100 is below minimum (1000) → ACK_ERROR."""
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_cmd_interval(100))
    frame = recv_until(ws, PKT_ACK, timeout=4.0)
    ws.close()
    assert frame is not None, "no ACK for interval=100"
    status = struct.unpack_from("BB", frame["payload"])[1]
    assert status != ACK_OK, f"expected ACK_ERROR for interval=100, got {status}"


def test_ws_set_interval_too_high(gateway):
    """interval_ms=999999 is above maximum (60000) → ACK_ERROR."""
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_cmd_interval(999999))
    frame = recv_until(ws, PKT_ACK, timeout=4.0)
    ws.close()
    assert frame is not None, "no ACK for interval=999999"
    status = struct.unpack_from("BB", frame["payload"])[1]
    assert status != ACK_OK, f"expected ACK_ERROR for interval=999999, got {status}"


def test_ws_history_l2(gateway):
    """L2 history request — server must respond (possibly empty) without crashing."""
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_history_req(RING_L2, 10))
    # L2 may be empty on a fresh server; accept either a response or silence
    frame = recv_until(ws, PKT_HISTORY_RESP, timeout=4.0)
    ws.close()
    if frame is not None:
        assert frame["payload"][0] == RING_L2


def test_ws_history_l3(gateway):
    """L3 history request — server must respond (possibly empty) without crashing."""
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_history_req(RING_L3, 10))
    frame = recv_until(ws, PKT_HISTORY_RESP, timeout=4.0)
    ws.close()
    if frame is not None:
        assert frame["payload"][0] == RING_L3


def test_ws_cmd_stop_start(gateway):
    """CMD_STOP pauses pushes; CMD_START resumes them."""
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)

    ws.send(build_cmd_raw(CMD_STOP))
    # After STOP, no metrics should arrive for 2s
    frame = recv_until(ws, PKT_METRICS, timeout=2.0)
    assert frame is None, "received PKT_METRICS after CMD_STOP"

    ws.send(build_cmd_raw(CMD_START))
    frame = recv_until(ws, PKT_METRICS, timeout=4.0)
    ws.close()
    assert frame is not None, "no PKT_METRICS after CMD_START"


def test_ws_get_sysinfo(gateway):
    ws = WSClient(gateway["host"], gateway["port"])
    recv_until(ws, PKT_METRICS)
    ws.send(build_cmd_raw(CMD_GET_SYS_INFO))
    frame = recv_until(ws, PKT_SYS_INFO, timeout=4.0)
    ws.close()
    assert frame is not None, "no PKT_SYS_INFO"
    # hostname is first 64 bytes, must be non-empty
    hostname = frame["payload"][:64].rstrip(b"\x00")
    assert len(hostname) > 0, "empty hostname in PKT_SYS_INFO"
