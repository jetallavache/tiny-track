"""
test_sock.py — socket / epoll correctness tests.

Tests:
  - TCP connect/bind/listen/accept cycle
  - epoll EPOLLIN fires on data arrival
  - epoll EPOLLHUP fires on peer close
  - EPOLLET (edge-triggered): must drain until EAGAIN
  - FD leak: gateway closes accepted FDs on client disconnect
"""
import errno
import os
import select
import socket
import threading
import time

import pytest

HOST = "127.0.0.1"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_server():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, 0))
    s.listen(5)
    return s, s.getsockname()[1]


# ---------------------------------------------------------------------------
# Basic socket lifecycle
# ---------------------------------------------------------------------------

def test_bind_listen_accept():
    srv, port = _make_server()
    cli = socket.create_connection((HOST, port), timeout=2)
    conn, _ = srv.accept()
    assert conn.fileno() > 0
    conn.close(); cli.close(); srv.close()


def test_nonblocking_connect():
    srv, port = _make_server()
    cli = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    cli.setblocking(False)
    err = cli.connect_ex((HOST, port))
    assert err in (0, errno.EINPROGRESS)
    # wait for writability = connected
    _, wr, _ = select.select([], [cli], [], 2.0)
    assert wr, "connect did not complete"
    conn, _ = srv.accept()
    conn.close(); cli.close(); srv.close()


# ---------------------------------------------------------------------------
# epoll EPOLLIN
# ---------------------------------------------------------------------------

def test_epoll_epollin():
    srv, port = _make_server()
    cli = socket.create_connection((HOST, port), timeout=2)
    conn, _ = srv.accept()
    conn.setblocking(False)

    ep = select.epoll()
    ep.register(conn.fileno(), select.EPOLLIN)

    cli.sendall(b"hello")
    events = ep.poll(timeout=2.0)
    assert any(ev & select.EPOLLIN for _, ev in events), "EPOLLIN not fired"

    ep.close(); conn.close(); cli.close(); srv.close()


# ---------------------------------------------------------------------------
# epoll EPOLLHUP on peer close
# ---------------------------------------------------------------------------

def test_epoll_epollhup():
    srv, port = _make_server()
    cli = socket.create_connection((HOST, port), timeout=2)
    conn, _ = srv.accept()
    conn.setblocking(False)

    ep = select.epoll()
    ep.register(conn.fileno(), select.EPOLLIN | select.EPOLLHUP)

    cli.close()  # peer closes
    events = ep.poll(timeout=2.0)
    assert events, "no epoll event after peer close"
    assert any(ev & (select.EPOLLHUP | select.EPOLLIN) for _, ev in events)

    ep.close(); conn.close(); srv.close()


# ---------------------------------------------------------------------------
# EPOLLET — edge-triggered: must read until EAGAIN
# ---------------------------------------------------------------------------

def test_epollet_drain():
    srv, port = _make_server()
    cli = socket.create_connection((HOST, port), timeout=2)
    conn, _ = srv.accept()
    conn.setblocking(False)

    ep = select.epoll()
    ep.register(conn.fileno(), select.EPOLLIN | select.EPOLLET)

    # Send 3 chunks — ET should fire once; we must drain all
    cli.sendall(b"A" * 1024)
    cli.sendall(b"B" * 1024)
    cli.sendall(b"C" * 1024)
    time.sleep(0.05)

    events = ep.poll(timeout=2.0)
    assert events, "EPOLLET: no event"

    # Drain until EAGAIN
    received = b""
    while True:
        try:
            chunk = conn.recv(256)
            if not chunk:
                break
            received += chunk
        except BlockingIOError:
            break

    assert len(received) == 3072, f"ET drain incomplete: {len(received)}"
    ep.close(); conn.close(); cli.close(); srv.close()


# ---------------------------------------------------------------------------
# FD leak: gateway closes FDs on disconnect
# ---------------------------------------------------------------------------

def test_gateway_fd_leak(gateway):
    """Connect N clients, disconnect them, check /proc/<pid>/fd count."""
    import subprocess, glob

    host, port = gateway["host"], gateway["port"]

    # Find gateway PID
    result = subprocess.run(
        ["pgrep", "-x", "tinytrack"], capture_output=True, text=True
    )
    if not result.stdout.strip():
        pytest.skip("tinytrack process not found")
    pid = result.stdout.strip().split()[0]

    def fd_count():
        return len(glob.glob(f"/proc/{pid}/fd/*"))

    N = 20
    before = fd_count()

    conns = []
    for _ in range(N):
        try:
            c = socket.create_connection((host, port), timeout=2)
            conns.append(c)
        except OSError:
            break

    time.sleep(0.3)
    for c in conns:
        c.close()
    time.sleep(0.5)

    after = fd_count()
    leaked = after - before
    assert leaked <= 2, f"FD leak: {leaked} FDs not closed after {N} disconnects"
