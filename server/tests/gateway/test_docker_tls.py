"""
test_docker_tls.py — TLS tests against a running Docker container.

Uses TINYTRACK_TEST_PORT env var for the port (set by run_gateway_tests.sh).
The container must be started with TT_LISTEN=wss://... and TT_TLS_CERT/KEY.
"""
import os
import socket
import ssl
import pytest

from test_ws import WSClient, PKT_METRICS, build_cmd, CMD_GET_SNAPSHOT, recv_until

PORT = int(os.environ.get("TINYTRACK_TEST_PORT", 14033))


@pytest.fixture(scope="module")
def tls_ctx():
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def test_docker_tls_tcp_connect(tls_ctx):
    with socket.create_connection(("127.0.0.1", PORT), timeout=5) as raw:
        with tls_ctx.wrap_socket(raw, server_hostname="localhost") as tls:
            assert tls.version() in ("TLSv1.2", "TLSv1.3")


def test_docker_tls_rejects_plain_http(tls_ctx):
    with socket.create_connection(("127.0.0.1", PORT), timeout=3) as s:
        s.sendall(b"GET / HTTP/1.0\r\n\r\n")
        s.settimeout(2.0)
        try:
            data = s.recv(256)
            assert b"200" not in data[:20]
        except (socket.timeout, ConnectionResetError):
            pass


def test_docker_tls_ws_metrics(tls_ctx):
    ws = WSClient("127.0.0.1", PORT, ssl_ctx=tls_ctx)
    frame = recv_until(ws, PKT_METRICS)
    assert frame is not None, "PKT_METRICS not received over TLS"
    ws.close()


def test_docker_tls_cipher_is_strong(tls_ctx):
    with socket.create_connection(("127.0.0.1", PORT), timeout=5) as raw:
        with tls_ctx.wrap_socket(raw, server_hostname="localhost") as tls:
            cipher_name = tls.cipher()[0]
            weak = ("RC4", "DES", "NULL", "EXPORT", "anon")
            assert not any(w in cipher_name for w in weak), \
                f"weak cipher: {cipher_name}"
