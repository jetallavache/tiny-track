"""
test_tls.py — TLS handshake and encrypted WS tests.

Requires openssl binary for cert generation (done in conftest.gateway_tls).
"""
import socket
import ssl
import struct
import time

import pytest

from test_ws import (WSClient, PKT_CONFIG, PKT_METRICS,
                     build_cmd, CMD_GET_SNAPSHOT, recv_until)


def test_tls_tcp_connect(gateway_tls):
    """Raw TLS TCP connect completes handshake."""
    ctx = gateway_tls["ssl_ctx"]
    with socket.create_connection(
        (gateway_tls["host"], gateway_tls["port"]), timeout=5
    ) as raw:
        with ctx.wrap_socket(raw, server_hostname="localhost") as tls:
            assert tls.version() is not None
            assert tls.version() in ("TLSv1.2", "TLSv1.3")


def test_tls_rejects_plain_http(gateway_tls):
    """Plain HTTP to a TLS port should fail (not return 200)."""
    with socket.create_connection(
        (gateway_tls["host"], gateway_tls["port"]), timeout=3
    ) as s:
        s.sendall(b"GET / HTTP/1.0\r\n\r\n")
        s.settimeout(2.0)
        try:
            data = s.recv(256)
            # If we get data it should NOT be a valid HTTP 200
            assert b"200" not in data[:20]
        except (socket.timeout, ConnectionResetError):
            pass  # expected — TLS layer rejects plain data


def test_tls_ws_connect_and_config(gateway_tls):
    ws = WSClient(
        gateway_tls["host"], gateway_tls["port"],
        ssl_ctx=gateway_tls["ssl_ctx"]
    )
    frame = recv_until(ws, PKT_METRICS)
    assert frame is not None, "PKT_METRICS not received over TLS"
    ws.close()


def test_tls_ws_get_snapshot(gateway_tls):
    ws = WSClient(
        gateway_tls["host"], gateway_tls["port"],
        ssl_ctx=gateway_tls["ssl_ctx"]
    )
    recv_until(ws, PKT_METRICS)
    ws.send(build_cmd(CMD_GET_SNAPSHOT))
    frame = recv_until(ws, PKT_METRICS)
    assert frame is not None, "PKT_METRICS not received over TLS"
    ws.close()


def test_tls_cipher_is_strong(gateway_tls):
    """Negotiated cipher should not be RC4/DES/NULL."""
    ctx = gateway_tls["ssl_ctx"]
    with socket.create_connection(
        (gateway_tls["host"], gateway_tls["port"]), timeout=5
    ) as raw:
        with ctx.wrap_socket(raw, server_hostname="localhost") as tls:
            cipher_name = tls.cipher()[0]
            weak = ("RC4", "DES", "NULL", "EXPORT", "anon")
            assert not any(w in cipher_name for w in weak), \
                f"weak cipher negotiated: {cipher_name}"
