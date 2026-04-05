#include "tls.h"

#include <errno.h>
#include <openssl/err.h>
#include <openssl/ssl.h>
#include <string.h>

#include "common/log/log.h"
#include "net.h"
#include "sock.h"

/* Per-manager TLS context stored in mgr->userdata chain.
 * We use a small wrapper so mgr->userdata remains available to the app. */
struct ttg_tls_ctx {
  SSL_CTX* ssl_ctx;
};

/* Per-connection TLS state stored in c->tls (void*). */
struct ttg_tls {
  SSL* ssl;
};

/* --------------------------------------------------------------------------
 * Manager-level context
 * -------------------------------------------------------------------------- */

int ttg_tls_ctx_init(struct ttg_mgr* mgr, const struct ttg_tls_cfg* cfg) {
  if (!cfg || !cfg->cert_file || !cfg->key_file) {
    tt_log_err("tls_ctx_init: cert_file and key_file are required");
    return -1;
  }

  SSL_CTX* ctx = SSL_CTX_new(TLS_server_method());
  if (!ctx) {
    tt_log_err("SSL_CTX_new failed: %s", ERR_error_string(ERR_get_error(), NULL));
    return -1;
  }

  SSL_CTX_set_min_proto_version(ctx, TLS1_2_VERSION);
  SSL_CTX_set_options(ctx, SSL_OP_NO_SSLv2 | SSL_OP_NO_SSLv3 | SSL_OP_NO_TLSv1 | SSL_OP_NO_TLSv1_1);

  if (SSL_CTX_use_certificate_file(ctx, cfg->cert_file, SSL_FILETYPE_PEM) != 1) {
    tt_log_err("Failed to load cert: %s", cfg->cert_file);
    SSL_CTX_free(ctx);
    return -1;
  }
  if (SSL_CTX_use_PrivateKey_file(ctx, cfg->key_file, SSL_FILETYPE_PEM) != 1) {
    tt_log_err("Failed to load key: %s", cfg->key_file);
    SSL_CTX_free(ctx);
    return -1;
  }
  if (SSL_CTX_check_private_key(ctx) != 1) {
    tt_log_err("Certificate/key mismatch");
    SSL_CTX_free(ctx);
    return -1;
  }
  if (cfg->ca_file) {
    if (SSL_CTX_load_verify_locations(ctx, cfg->ca_file, NULL) != 1) {
      tt_log_err("Failed to load CA: %s", cfg->ca_file);
      SSL_CTX_free(ctx);
      return -1;
    }
    SSL_CTX_set_verify(ctx, SSL_VERIFY_PEER | SSL_VERIFY_FAIL_IF_NO_PEER_CERT, NULL);
  }

  struct ttg_tls_ctx* tc = calloc(1, sizeof(*tc));
  if (!tc) {
    SSL_CTX_free(ctx);
    return -1;
  }
  tc->ssl_ctx = ctx;
  mgr->tls_ctx = tc;

  tt_log_info("TLS context initialised (cert=%s)", cfg->cert_file);
  return 0;
}

void ttg_tls_ctx_free(struct ttg_mgr* mgr) {
  struct ttg_tls_ctx* tc = (struct ttg_tls_ctx*)mgr->tls_ctx;
  if (!tc) return;
  SSL_CTX_free(tc->ssl_ctx);
  free(tc);
  mgr->tls_ctx = NULL;
}

/* --------------------------------------------------------------------------
 * Per-connection TLS
 * -------------------------------------------------------------------------- */

int ttg_tls_init(struct ttg_conn* c) {
  struct ttg_tls_ctx* tc = (struct ttg_tls_ctx*)c->mgr->tls_ctx;
  if (!tc) {
    tt_log_err("tls_init: no TLS context on manager");
    return -1;
  }

  SSL* ssl = SSL_new(tc->ssl_ctx);
  if (!ssl) {
    tt_log_err("SSL_new failed");
    return -1;
  }

  if (SSL_set_fd(ssl, FD(c)) != 1) {
    tt_log_err("SSL_set_fd failed");
    SSL_free(ssl);
    return -1;
  }

  struct ttg_tls* t = calloc(1, sizeof(*t));
  if (!t) {
    SSL_free(ssl);
    return -1;
  }
  t->ssl = ssl;
  c->tls = t;
  c->is_tls = 1;
  c->is_tls_hs = 1;
  return 0;
}

void ttg_tls_free(struct ttg_conn* c) {
  struct ttg_tls* t = (struct ttg_tls*)c->tls;
  if (!t) return;
  SSL_free(t->ssl);
  free(t);
  c->tls = NULL;
}

void ttg_tls_handshake(struct ttg_conn* c) {
  struct ttg_tls* t = (struct ttg_tls*)c->tls;
  if (!t) return;

  int rc = SSL_accept(t->ssl);
  if (rc == 1) {
    c->is_tls_hs = 0;
    tt_log_info("%lu TLS handshake complete (%s)", c->id, SSL_get_cipher(t->ssl));
    return;
  }

  int err = SSL_get_error(t->ssl, rc);
  if (err == SSL_ERROR_WANT_READ || err == SSL_ERROR_WANT_WRITE)
    return; /* handshake in progress — wait for next poll */

  tt_log_err("%lu TLS handshake failed: %s", c->id, ERR_error_string(ERR_get_error(), NULL));
  c->is_closing = 1;
}

long ttg_tls_recv(struct ttg_conn* c, void* buf, size_t len) {
  struct ttg_tls* t = (struct ttg_tls*)c->tls;
  int n = SSL_read(t->ssl, buf, (int)len);
  if (n > 0) return n;
  int err = SSL_get_error(t->ssl, n);
  if (err == SSL_ERROR_WANT_READ || err == SSL_ERROR_WANT_WRITE) return TTG_IO_WAIT;
  if (err == SSL_ERROR_ZERO_RETURN) return TTG_IO_RESET; /* clean shutdown */
  return TTG_IO_ERR;
}

long ttg_tls_send(struct ttg_conn* c, const void* buf, size_t len) {
  struct ttg_tls* t = (struct ttg_tls*)c->tls;
  int n = SSL_write(t->ssl, buf, (int)len);
  if (n > 0) return n;
  int err = SSL_get_error(t->ssl, n);
  if (err == SSL_ERROR_WANT_READ || err == SSL_ERROR_WANT_WRITE) return TTG_IO_WAIT;
  return TTG_IO_ERR;
}

int ttg_tls_pending(struct ttg_conn* c) {
  struct ttg_tls* t = (struct ttg_tls*)c->tls;
  return t ? SSL_pending(t->ssl) : 0;
}
