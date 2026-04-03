# TLS Certificates

This directory contains TLS certificates for `tinytrack` gateway.

The included `server.crt` / `server.key` are **self-signed test certificates**
and must not be used in production.

## Generate a self-signed certificate (development/testing)

```bash
openssl req -x509 -newkey rsa:4096 \
    -keyout server.key -out server.crt \
    -days 365 -nodes \
    -subj '/CN=localhost'
```

## Generate with SAN (recommended for modern browsers/clients)

```bash
openssl req -x509 -newkey rsa:4096 \
    -keyout server.key -out server.crt \
    -days 365 -nodes \
    -subj '/CN=localhost' \
    -addext 'subjectAltName=IP:127.0.0.1,DNS:localhost'
```

## Generate a CA + server certificate (production-like setup)

```bash
# 1. Create CA key and certificate
openssl req -x509 -newkey rsa:4096 -days 3650 -nodes \
    -keyout ca.key -out ca.crt -subj '/CN=TinyTrack CA'

# 2. Create server key and CSR
openssl req -newkey rsa:4096 -nodes \
    -keyout server.key -out server.csr -subj '/CN=localhost'

# 3. Sign the server certificate with the CA
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt -days 365 \
    -extfile <(printf 'subjectAltName=IP:127.0.0.1,DNS:localhost')
```

## Enable TLS in tinytrack.conf

```ini
[gateway]
listen   = wss://0.0.0.0:4443
tls_cert = /etc/tinytrack/certs/server.crt
tls_key  = /etc/tinytrack/certs/server.key
# tls_ca = /etc/tinytrack/certs/ca.crt   # optional: client cert auth
```

## File permissions

```bash
chmod 600 server.key
chmod 644 server.crt
```
