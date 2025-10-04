#include "s_ws.h"

#include <netinet/in.h>
#include <openssl/bio.h>
#include <openssl/err.h>
#include <openssl/evp.h>
#include <openssl/sha.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "b64.h"
#include "log.h"
#include "s_http.h"
#include "s_printf.h"
#include "s_sock.h"
#include "s_url.h"
#include "util.h"

struct ws_msg {
  uint8_t flags;
  size_t header_len;
  size_t data_len;
};

size_t s_ws_vprintf(struct s_conn *c, int op, const char *fmt, va_list *ap) {
  size_t len = c->send.len;
  size_t n = s_vxprintf(s_pfn_iobuf, &c->send, fmt, ap);
  s_ws_wrap(c, c->send.len - len, op);
  return n;
}

size_t s_ws_printf(struct s_conn *c, int op, const char *fmt, ...) {
  size_t len = 0;
  va_list ap;
  va_start(ap, fmt);
  len = s_ws_vprintf(c, op, fmt, &ap);
  va_end(ap);
  return len;
}

static void ws_handshake(struct s_conn *c, const struct str_t *wskey,
                         const struct str_t *wsproto, const char *fmt,
                         va_list *ap) {
  const char *magic = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  unsigned char sha[20], b64_sha[30];

  // OpenSSL_add_all_algorithms();
  // ERR_load_crypto_strings();
  // EVP_MD_CTX *hashctx;
  // hashctx = EVP_MD_CTX_create();
  // const EVP_MD *hashptr = EVP_get_digestbyname("SHA1");
  // EVP_MD_CTX_init(hashctx);
  // EVP_DigestInit_ex(hashctx, hashptr, NULL);
  // EVP_DigestUpdate(hashctx, wskey->buf, wskey->len);
  // EVP_DigestUpdate(hashctx, magic, sizeof(magic));
  // EVP_DigestFinal_ex(hashctx, sha, NULL);
  // // EVP_MD_CTX_cleanup(hashctx);
  // EVP_MD_CTX_free(hashctx);

  SHA_CTX sha_ctx;
  SHA1_Init(&sha_ctx);
  SHA1_Update(&sha_ctx, (unsigned char *)wskey->buf, wskey->len);
  SHA1_Update(&sha_ctx, (unsigned char *)magic, 36);
  SHA1_Final(sha, &sha_ctx);

  b64_encode(sha, sizeof(sha), (char *)b64_sha, sizeof(b64_sha));
  s_xprintf(s_pfn_iobuf, &c->send,
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            "Sec-WebSocket-Accept: %s\r\n",
            b64_sha);
  if (fmt != NULL) s_vxprintf(s_pfn_iobuf, &c->send, fmt, ap);
  if (wsproto != NULL) {
    s_net_printf(c, "Sec-WebSocket-Protocol: %.*s\r\n", (int)wsproto->len,
                 wsproto->buf);
  }
  s_sock_send(c, "\r\n", 2);
}

static uint32_t be32(const uint8_t *p) {
  return (((uint32_t)p[3]) << 0) | (((uint32_t)p[2]) << 8) |
         (((uint32_t)p[1]) << 16) | (((uint32_t)p[0]) << 24);
}

static size_t ws_process(uint8_t *buf, size_t len, struct ws_msg *msg) {
  size_t i, n = 0, mask_len = 0;
  memset(msg, 0, sizeof(*msg));
  if (len >= 2) {
    n = buf[1] & 0x7f;                /* Длина фрейма */
    mask_len = buf[1] & 128 ? 4 : 0;  /* Последний бит -это бит маск */
    msg->flags = buf[0];
    if (n < 126 && len >= mask_len) {
      msg->data_len = n;
      msg->header_len = 2 + mask_len;
    } else if (n == 126 && len >= 4 + mask_len) {
      msg->header_len = 4 + mask_len;
      msg->data_len = (((size_t)buf[2]) << 8) | buf[3];
    } else if (len >= 10 + mask_len) {
      msg->header_len = 10 + mask_len;
      msg->data_len = (size_t)(((uint64_t)be32(buf + 2) << 32) + be32(buf + 6));
    }
  }
  // Sanity check, and integer overflow protection for the boundary check below
  // data_len should not be larger than 1 Gb
  if (msg->data_len > 1024 * 1024 * 1024) return 0;
  if (msg->header_len + msg->data_len > len) return 0;
  if (mask_len > 0) {
    uint8_t *p = buf + msg->header_len, *m = p - mask_len;
    for (i = 0; i < msg->data_len; i++) p[i] ^= m[i & 3];
  }
  return msg->header_len + msg->data_len;
}

static size_t mkhdr(size_t len, int op, bool is_client, uint8_t *buf) {
  size_t n = 0;
  buf[0] = (uint8_t)(op | 128);
  if (len < 126) {
    buf[1] = (unsigned char)len;
    n = 2;
  } else if (len < 65536) {
    uint16_t tmp = htons((uint16_t)len);
    buf[1] = 126;
    memcpy(&buf[2], &tmp, sizeof(tmp));
    n = 4;
  } else {
    uint32_t tmp;
    buf[1] = 127;
    tmp = htonl((uint32_t)(((uint64_t)len) >> 32));
    memcpy(&buf[2], &tmp, sizeof(tmp));
    tmp = htonl((uint32_t)(len & 0xffffffffU));
    memcpy(&buf[6], &tmp, sizeof(tmp));
    n = 10;
  }
  if (is_client) {
    buf[1] |= 1 << 7;  // Set masking flag
    util_random(&buf[n], 4);
    n += 4;
  }
  return n;
}

static void s_ws_mask(struct s_conn *c, size_t len) {
  if (c->is_client && c->send.buf != NULL) {
    size_t i;
    uint8_t *p = c->send.buf + c->send.len - len, *mask = p - 4;
    for (i = 0; i < len; i++) p[i] ^= mask[i & 3];
  }
}

size_t s_ws_send(struct s_conn *c, const void *buf, size_t len, int op) {
  uint8_t header[14];
  size_t header_len = mkhdr(len, op, c->is_client, header);
  if (!s_sock_send(c, header, header_len)) return 0;
  if (!s_sock_send(c, buf, len)) return header_len;
  L_VERBOSE(("WS out: %d [%.*s]", (int)len, (int)len, buf));
  s_ws_mask(c, len);
  return header_len + len;
}

static bool s_ws_client_handshake(struct s_conn *c) {
  int n = s_http_get_request_len(c->recv.buf, c->recv.len);
  if (n < 0) {
    s_event_error(c, "not http");  // Some just, not an HTTP request
  } else if (n > 0) {
    if (n < 15 || memcmp(c->recv.buf + 9, "101", 3) != 0) {
      s_event_error(c, "ws handshake error");
    } else {
      struct s_http_message hm;
      if (s_http_parse((char *)c->recv.buf, c->recv.len, &hm)) {
        c->is_websocket = 1;
        s_event_call(c, S_EVENT_WS_OPEN, &hm);
      } else {
        s_event_error(c, "ws handshake error");
      }
    }
    s_iobuf_del(&c->recv, 0, (size_t)n);
  } else {
    return true;  // Request is not yet received, quit event handler
  }
  return false;  // Continue event handler
}

static void s_ws_cb(struct s_conn *c, int ev, void *ev_data) {
  struct ws_msg msg;
  size_t ofs = (size_t)c->pfn_data;

  //   assert(ofs < c->recv.len);
  if (ev == S_EVENT_READ) {
    if (c->is_client && !c->is_websocket && s_ws_client_handshake(c)) return;

    while (ws_process(c->recv.buf + ofs, c->recv.len - ofs, &msg) > 0) {
      char *s = (char *)c->recv.buf + ofs + msg.header_len;
      struct s_ws_message m = {{s, msg.data_len}, msg.flags};
      size_t len = msg.header_len + msg.data_len;
      uint8_t final = msg.flags & 128, op = msg.flags & 15;
      L_VERBOSE(("fin %d op %d len %d [%.*s]", final, op, (int)m.data.len,
                 (int)m.data.len, m.data.buf));
      switch (op) {
        case WS_OP_CONTINUATION:
          s_event_call(c, S_EVENT_WS_CTL, &m);
          break;
        case WS_OP_PING:
          L_DEBUG(("%s", "WS PONG"));
          s_ws_send(c, s, msg.data_len, WS_OP_PONG);
          s_event_call(c, S_EVENT_WS_CTL, &m);
          break;
        case WS_OP_PONG:
          s_event_call(c, S_EVENT_WS_CTL, &m);
          break;
        case WS_OP_TEXT:
        case WS_OP_BINARY:
          if (final) s_event_call(c, S_EVENT_WS_MSG, &m);
          break;
        case WS_OP_CLOSE:
          L_DEBUG(("%lu WS CLOSE", c->id));
          s_event_call(c, S_EVENT_WS_CTL, &m);
          // Echo the payload of the received CLOSE message back to the sender
          s_ws_send(c, m.data.buf, m.data.len, WS_OP_CLOSE);
          c->is_draining = 1;
          break;
        default:
          // Per RFC6455, close conn when an unknown op is recvd
          s_event_error(c, "unknown WS op %d", op);
          break;
      }

      // Handle fragmented frames: strip header, keep in c->recv
      if (final == 0 || op == 0) {
        if (op) ofs++, len--, msg.header_len--;      // First frame
        s_iobuf_del(&c->recv, ofs, msg.header_len);  // Strip header
        len -= msg.header_len;
        ofs += len;
        c->pfn_data = (void *)ofs;
        // L_INFO(("FRAG %d [%.*s]", (int) ofs, (int) ofs, c->recv.buf));
      }
      /* Remove non-fragmented frame */ 
      if (final && op) s_iobuf_del(&c->recv, ofs, len);
      /* Last chunk of the fragmented frame */
      if (final && !op && (ofs > 0)) {
        m.flags = c->recv.buf[0];
        m.data = str_n((char *)&c->recv.buf[1], (size_t)(ofs - 1));
        s_event_call(c, S_EVENT_WS_MSG, &m);
        s_iobuf_del(&c->recv, 0, ofs);
        ofs = 0;
        c->pfn_data = NULL;
      }
    }
  }
  (void)ev_data;
}

struct s_conn *s_ws_connect(struct s_mgr *mgr, const char *url,
                            s_event_handler_t fn, void *fn_data,
                            const char *fmt, ...) {
  struct s_conn *c = s_net_connect(mgr, url, fn, fn_data);
  if (c != NULL) {
    char nonce[16], key[30];
    struct str_t host = s_url_host(url);
    util_random(nonce, sizeof(nonce));
    b64_encode((unsigned char *)nonce, sizeof(nonce), key, sizeof(key));
    s_xprintf(s_pfn_iobuf, &c->send,
              "GET %s HTTP/1.1\r\n"
              "Upgrade: websocket\r\n"
              "Host: %.*s\r\n"
              "Connection: Upgrade\r\n"
              "Sec-WebSocket-Version: 13\r\n"
              "Sec-WebSocket-Key: %s\r\n",
              s_url_uri(url), (int)host.len, host.buf, key);
    if (fmt != NULL) {
      va_list ap;
      va_start(ap, fmt);
      s_vxprintf(s_pfn_iobuf, &c->send, fmt, &ap);
      va_end(ap);
    }
    s_xprintf(s_pfn_iobuf, &c->send, "\r\n");
    c->pfn = s_ws_cb;
    c->pfn_data = NULL;
  }
  return c;
}

void s_ws_upgrade(struct s_conn *c, struct s_http_message *hm, const char *fmt,
                  ...) {
  struct str_t *wskey = s_http_get_header(hm, "Sec-WebSocket-Key");
  c->pfn = s_ws_cb;
  c->pfn_data = NULL;
  if (wskey == NULL) {
    s_http_reply(c, 426, "", "WS upgrade expected\n");
    c->is_draining = 1;
  } else {
    struct str_t *wsproto = s_http_get_header(hm, "Sec-WebSocket-Protocol");
    va_list ap;
    va_start(ap, fmt);
    ws_handshake(c, wskey, wsproto, fmt, &ap);
    va_end(ap);
    c->is_websocket = 1;
    c->is_resp = 0;
    s_event_call(c, S_EVENT_WS_OPEN, hm);
  }
}

size_t s_ws_wrap(struct s_conn *c, size_t len, int op) {
  uint8_t header[14], *p;
  size_t header_len = mkhdr(len, op, c->is_client, header);

  // NOTE: order of operations is important!
  if (s_iobuf_add(&c->send, c->send.len, NULL, header_len) != 0) {
    p = &c->send.buf[c->send.len - len];         // p points to data
    memmove(p, p - header_len, len);             // Shift data
    memcpy(p - header_len, header, header_len);  // Prepend header
    s_ws_mask(c, len);                           // Mask data
  }
  return c->send.len;
}
