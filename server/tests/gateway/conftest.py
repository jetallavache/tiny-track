"""
conftest.py — pytest fixtures: start tinytd + tinytrack, yield port, teardown.
"""
import os
import signal
import socket
import subprocess
import tempfile
import time

import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
TINYTD    = os.path.join(ROOT, "tinytd/tinytd")
TINYTRACK = os.path.join(ROOT, "gateway/tinytrack")
CONF      = os.path.join(ROOT, "tests/tinytrack.conf-test")

GW_PORT     = int(os.environ.get("TINYTRACK_TEST_PORT", 14028))   # plain WS
GW_TLS_PORT = 14443   # TLS WS


def _wait_port(host, port, timeout=5.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.2):
                return True
        except OSError:
            time.sleep(0.1)
    return False


def _wait_file(path, timeout=5.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if os.path.exists(path):
            return True
        time.sleep(0.1)
    return False


@pytest.fixture(scope="session")
def gateway(tmp_path_factory):
    """Start tinytd + tinytrack (plain WS). Session-scoped.
    If TINYTRACK_TEST_PORT is set, assume servers are already running externally."""
    external = "TINYTRACK_TEST_PORT" in os.environ

    def _conf_path(key):
        with open(CONF) as f:
            for line in f:
                if line.strip().startswith(key):
                    return line.split("=", 1)[1].strip()
        return None

    live   = _conf_path("live_path")   or "/tmp/tinytd-test-live.dat"
    shadow = _conf_path("shadow_path") or "/tmp/tinytd-test-shadow.dat"

    td = gw = None
    if not external:
        for f in (live, shadow):
            try:
                os.unlink(f)
            except FileNotFoundError:
                pass

        td = subprocess.Popen(
            [TINYTD, "-c", CONF],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        assert _wait_file(live, timeout=6), "tinytd did not create live file"

        gw = subprocess.Popen(
            [TINYTRACK, "-c", CONF, "-p", str(GW_PORT)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )

    assert _wait_port("127.0.0.1", GW_PORT, timeout=5), "tinytrack did not start"

    yield {"host": "127.0.0.1", "port": GW_PORT, "ws_url": f"ws://127.0.0.1:{GW_PORT}"}

    if not external:
        if gw: gw.terminate(); gw.wait(timeout=3)
        if td: td.terminate(); td.wait(timeout=3)
        for f in (live, shadow):
            try:
                os.unlink(f)
            except FileNotFoundError:
                pass


@pytest.fixture(scope="session")
def gateway_tls(tmp_path_factory):
    """Start tinytd + tinytrack with TLS. Generates a self-signed cert.
    Uses separate live/shadow paths to avoid conflicting with the plain gateway fixture."""
    import re
    import ssl

    cert_dir = tmp_path_factory.mktemp("certs")
    cert = str(cert_dir / "server.crt")
    key  = str(cert_dir / "server.key")

    subprocess.run(
        ["openssl", "req", "-x509", "-newkey", "rsa:2048",
         "-keyout", key, "-out", cert,
         "-days", "1", "-nodes", "-subj", "/CN=localhost"],
        check=True, capture_output=True,
    )

    tls_live   = "/tmp/tinytd-tls-live.dat"
    tls_shadow = "/tmp/tinytd-tls-shadow.dat"

    # Build a fully patched config: separate storage paths, https:// (TLS), cert/key
    conf_text = open(CONF).read()
    conf_text = re.sub(r'live_path\s*=\s*\S+',   f'live_path = {tls_live}',   conf_text)
    conf_text = re.sub(r'shadow_path\s*=\s*\S+', f'shadow_path = {tls_shadow}', conf_text)
    conf_text = re.sub(r'port\s*=\s*\d+',        f'port = {GW_TLS_PORT}',     conf_text)
    conf_text = re.sub(r'max_connections\s*=\s*\d+', 'max_connections = 10',  conf_text)
    conf_text += f'\ntls      = true\ntls_cert = {cert}\ntls_key  = {key}\n'
    full_conf = str(cert_dir / "full-tls.conf")
    open(full_conf, "w").write(conf_text)

    for f in (tls_live, tls_shadow):
        try:
            os.unlink(f)
        except FileNotFoundError:
            pass

    td = subprocess.Popen(
        [TINYTD, "-c", full_conf],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    assert _wait_file(tls_live, timeout=6), "tinytd (tls) did not create live file"

    gw = subprocess.Popen(
        [TINYTRACK, "-c", full_conf],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    assert _wait_port("127.0.0.1", GW_TLS_PORT, timeout=5), "tinytrack TLS did not start"

    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    yield {
        "host": "127.0.0.1", "port": GW_TLS_PORT,
        "ssl_ctx": ctx, "cert": cert, "key": key,
        "ws_url": f"wss://127.0.0.1:{GW_TLS_PORT}",
    }

    gw.terminate()
    td.terminate()
    td.wait(timeout=3)
    gw.wait(timeout=3)
    for f in (tls_live, tls_shadow):
        try:
            os.unlink(f)
        except FileNotFoundError:
            pass
