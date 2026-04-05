#ifndef TTG_TLS_H
#define TTG_TLS_H

#include <stdbool.h>
#include <stddef.h>

struct ttg_mgr;
struct ttg_conn;

struct ttg_tls_cfg {
  const char* cert_file; /* Server certificate (PEM) */
  const char* key_file;  /* Private key (PEM)        */
  const char* ca_file;   /* CA bundle, or NULL        */
};

/*
 * Initialise the per-manager TLS context (SSL_CTX).
 * Call once after ttg_net_mgr_init().
 * Returns 0 on success, -1 on error.
 */
int ttg_tls_ctx_init(struct ttg_mgr* mgr, const struct ttg_tls_cfg* cfg);

/* Free the per-manager TLS context. */
void ttg_tls_ctx_free(struct ttg_mgr* mgr);

/*
 * Attach a TLS session to an accepted connection.
 * Call from TTG_EVENT_ACCEPT when c->is_tls is set.
 * Returns 0 on success, -1 on error (connection will be closed).
 */
int ttg_tls_init(struct ttg_conn* c);

/* Free per-connection TLS state. Called from ttg_net_close_conn(). */
void ttg_tls_free(struct ttg_conn* c);

/*
 * Drive the TLS handshake. Call when c->is_tls_hs == 1 and the socket
 * becomes readable or writable.
 * Sets c->is_tls_hs = 0 on completion.
 */
void ttg_tls_handshake(struct ttg_conn* c);

/* TLS send/recv — drop-in replacements for iosend/iorecv in sock.c */
long ttg_tls_recv(struct ttg_conn* c, void* buf, size_t len);
long ttg_tls_send(struct ttg_conn* c, const void* buf, size_t len);

/* Returns number of bytes pending in the TLS read buffer. */
int ttg_tls_pending(struct ttg_conn* c);

#endif /* TTG_TLS_H */
