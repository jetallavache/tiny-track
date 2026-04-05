#include "ws.h"

#include <netinet/in.h>
#include <openssl/bio.h>
#include <openssl/err.h>
#include <openssl/evp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "b64.h"
#include "common/log/log.h"
#include "http.h"
#include "printf.h"
#include "sock.h"
#include "url.h"
#include "util.h"

struct ws_msg {
  uint8_t flags;
  size_t header_len;
  size_t data_len;
};

size_t ttg_ws_vprintf(struct ttg_conn* c, int op, const char* fmt, va_list* ap) {
  size_t len = c->send.len;
  size_t n = ttg_vxprintf(ttg_pfn_iobuf, &c->send, fmt, ap);
  ttg_ws_wrap(c, c->send.len - len, op);
  return n;
}

size_t ttg_ws_printf(struct ttg_conn* c, int op, const char* fmt, ...) {
  size_t len = 0;
  va_list ap;
  va_start(ap, fmt);
  len = ttg_ws_vprintf(c, op, fmt, &ap);
  va_end(ap);
  return len;
}

static void ws_handshake(struct ttg_conn* c, const struct ttg_str* wskey,
                         const struct ttg_str* wsproto, const char* fmt, va_list* ap) {
  const char* magic = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  unsigned char sha[20], b64_sha[30];

  unsigned int sha_len = 20;
  EVP_MD_CTX* mdctx = EVP_MD_CTX_new();
  EVP_DigestInit_ex(mdctx, EVP_sha1(), NULL);
  EVP_DigestUpdate(mdctx, wskey->buf, wskey->len);
  EVP_DigestUpdate(mdctx, magic, 36);
  EVP_DigestFinal_ex(mdctx, sha, &sha_len);
  EVP_MD_CTX_free(mdctx);

  ttg_b64_encode(sha, sizeof(sha), (char*)b64_sha, sizeof(b64_sha));
  ttg_xprintf(ttg_pfn_iobuf, &c->send,
              "HTTP/1.1 101 Switching Protocols\r\n"
              "Upgrade: websocket\r\n"
              "Connection: Upgrade\r\n"
              "Sec-WebSocket-Accept: %s\r\n",
              b64_sha);
  if (fmt != NULL) ttg_vxprintf(ttg_pfn_iobuf, &c->send, fmt, ap);
  if (wsproto != NULL) {
    ttg_net_printf(c, "Sec-WebSocket-Protocol: %.*s\r\n", (int)wsproto->len, wsproto->buf);
  }
  ttg_sock_send(c, "\r\n", 2);
}

static uint32_t be32(const uint8_t* p) {
  return (((uint32_t)p[3]) << 0) | (((uint32_t)p[2]) << 8) | (((uint32_t)p[1]) << 16) |
         (((uint32_t)p[0]) << 24);
}

static size_t ws_process(uint8_t* buf, size_t len, struct ws_msg* msg) {
  size_t i, mask_len = 0;
  memset(msg, 0, sizeof(*msg));
  if (len >= 2) {
    size_t n = buf[1] & 0x7f;        /* Frame length */
    mask_len = buf[1] & 128 ? 4 : 0; /* Last bit is the mask bit */
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
  /* Sanity check, and integer overflow protection for the boundary check below
   */
  /* data_len should not be larger than 1 Gb */
  if (msg->data_len > 1024 * 1024 * 1024) return 0;
  if (msg->header_len + msg->data_len > len) return 0;
  if (mask_len > 0) {
    uint8_t *p = buf + msg->header_len, *m = p - mask_len;
    for (i = 0; i < msg->data_len; i++) p[i] ^= m[i & 3];
  }
  return msg->header_len + msg->data_len;
}

static size_t mkhdr(size_t len, int op, bool is_client, uint8_t* buf) {
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
    buf[1] |= 1 << 7; /* Set masking flag */
    ttg_util_random(&buf[n], 4);
    n += 4;
  }
  return n;
}

static void ttg_ws_mask(struct ttg_conn* c, size_t len) {
  if (c->is_client && c->send.buf != NULL) {
    size_t i;
    uint8_t *p = c->send.buf + c->send.len - len, *mask = p - 4;
    for (i = 0; i < len; i++) p[i] ^= mask[i & 3];
  }
}

size_t ttg_ws_send(struct ttg_conn* c, const void* buf, size_t len, int op) {
  uint8_t header[14];
  size_t header_len = mkhdr(len, op, c->is_client, header);
  if (!ttg_sock_send(c, header, header_len)) return 0;
  if (!ttg_sock_send(c, buf, len)) return header_len;
  tt_log_debug("WS out: %d [%.*s]", (int)len, (int)len, buf);
  ttg_ws_mask(c, len);
  return header_len + len;
}

static bool ttg_ws_client_handshake(struct ttg_conn* c) {
  int n = ttg_http_get_request_len(c->recv.buf, c->recv.len);
  if (n < 0) {
    ttg_event_error(c, "not http"); /* Some just, not an HTTP request */
  } else if (n > 0) {
    if (n < 15 || memcmp(c->recv.buf + 9, "101", 3) != 0) {
      ttg_event_error(c, "ws handshake error");
    } else {
      struct ttg_http_message hm;
      if (ttg_http_parse((char*)c->recv.buf, c->recv.len, &hm)) {
        c->is_websocket = 1;
        ttg_event_call(c, TTG_EVENT_WS_OPEN, &hm);
      } else {
        ttg_event_error(c, "ws handshake error");
      }
    }
    ttg_iobuf_del(&c->recv, 0, (size_t)n);
  } else {
    return true; /* Request is not yet received, quit event handler */
  }
  return false; /* Continue event handler */
}

static void ttg_ws_cb(struct ttg_conn* c, int ev, void* ev_data) {
  struct ws_msg msg;
  size_t ofs = (size_t)c->pfn_data;

  /*   assert(ofs < c->recv.len); */
  if (ev == TTG_EVENT_READ) {
    if (c->is_client && !c->is_websocket && ttg_ws_client_handshake(c)) return;

    while (ws_process(c->recv.buf + ofs, c->recv.len - ofs, &msg) > 0) {
      char* s = (char*)c->recv.buf + ofs + msg.header_len;
      struct ttg_ws_message m = {{s, msg.data_len}, msg.flags};
      size_t len = msg.header_len + msg.data_len;
      uint8_t final = msg.flags & 128, op = msg.flags & 15;
      tt_log_debug("fin %d op %d len %d [%.*s]", final, op, (int)m.data.len, (int)m.data.len,
                   m.data.buf);
      switch (op) {
        case TTG_WS_OP_CONTINUATION:
          ttg_event_call(c, TTG_EVENT_WS_CTL, &m);
          break;
        case TTG_WS_OP_PING:
          tt_log_debug("%s", "WS PONG");
          ttg_ws_send(c, s, msg.data_len, TTG_WS_OP_PONG);
          ttg_event_call(c, TTG_EVENT_WS_CTL, &m);
          break;
        case TTG_WS_OP_PONG:
          ttg_event_call(c, TTG_EVENT_WS_CTL, &m);
          break;
        case TTG_WS_OP_TEXT:
        case TTG_WS_OP_BINARY:
          if (final) ttg_event_call(c, TTG_EVENT_WS_MSG, &m);
          break;
        case TTG_WS_OP_CLOSE:
          tt_log_debug("%lu WS CLOSE", c->id);
          ttg_event_call(c, TTG_EVENT_WS_CTL, &m);
          /* Echo the payload of the received CLOSE message back to the sender
           */
          ttg_ws_send(c, m.data.buf, m.data.len, TTG_WS_OP_CLOSE);
          c->is_draining = 1;
          break;
        default:
          /* Per RFC6455, close conn when an unknown op is recvd */
          ttg_event_error(c, "unknown WS op %d", op);
          break;
      }

      /* Handle fragmented frames: strip header, keep in c->recv */
      if (final == 0 || op == 0) {
        if (op) ofs++, len--, msg.header_len--;       /* First frame */
        ttg_iobuf_del(&c->recv, ofs, msg.header_len); /* Strip header */
        len -= msg.header_len;
        ofs += len;
        c->pfn_data = (void*)ofs;
        /* tt_log_info("FRAG %d [%.*s]", (int) ofs, (int) ofs, c->recv.buf); */
      }
      /* Remove non-fragmented frame */
      if (final && op) ttg_iobuf_del(&c->recv, ofs, len);
      /* Last chunk of the fragmented frame */
      if (final && !op && (ofs > 0)) {
        m.flags = c->recv.buf[0];
        m.data = strl((char*)&c->recv.buf[1], (size_t)(ofs - 1));
        ttg_event_call(c, TTG_EVENT_WS_MSG, &m);
        ttg_iobuf_del(&c->recv, 0, ofs);
        ofs = 0;
        c->pfn_data = NULL;
      }
    }
  }
  (void)ev_data;
}

struct ttg_conn* ttg_ws_connect(struct ttg_mgr* mgr, const char* url, ttg_event_handler fn,
                                void* fn_data, const char* fmt, ...) {
  struct ttg_conn* c = ttg_net_connect(mgr, url, fn, fn_data);
  if (c != NULL) {
    char nonce[16], key[30];
    struct ttg_str host = ttg_url_host(url);
    ttg_util_random(nonce, sizeof(nonce));
    ttg_b64_encode((unsigned char*)nonce, sizeof(nonce), key, sizeof(key));
    ttg_xprintf(ttg_pfn_iobuf, &c->send,
                "GET %s HTTP/1.1\r\n"
                "Upgrade: websocket\r\n"
                "Host: %.*s\r\n"
                "Connection: Upgrade\r\n"
                "Sec-WebSocket-Version: 13\r\n"
                "Sec-WebSocket-Key: %s\r\n",
                ttg_url_uri(url), (int)host.len, host.buf, key);
    if (fmt != NULL) {
      va_list ap;
      va_start(ap, fmt);
      ttg_vxprintf(ttg_pfn_iobuf, &c->send, fmt, &ap);
      va_end(ap);
    }
    ttg_xprintf(ttg_pfn_iobuf, &c->send, "\r\n");
    c->pfn = ttg_ws_cb;
    c->pfn_data = NULL;
  }
  return c;
}

void ttg_ws_upgrade(struct ttg_conn* c, struct ttg_http_message* hm, const char* fmt, ...) {
  struct ttg_str* wskey = ttg_http_get_header(hm, "Sec-WebSocket-Key");
  c->pfn = ttg_ws_cb;
  c->pfn_data = NULL;
  if (wskey == NULL) {
    ttg_http_reply(c, 426, "", "WS upgrade expected\n");
    c->is_draining = 1;
  } else {
    struct ttg_str* wsproto = ttg_http_get_header(hm, "Sec-WebSocket-Protocol");
    va_list ap;
    va_start(ap, fmt);
    ws_handshake(c, wskey, wsproto, fmt, &ap);
    va_end(ap);
    c->is_websocket = 1;
    c->is_resp = 0;
    ttg_event_call(c, TTG_EVENT_WS_OPEN, hm);
  }
}

size_t ttg_ws_wrap(struct ttg_conn* c, size_t len, int op) {
  uint8_t header[14], *p;
  size_t header_len = mkhdr(len, op, c->is_client, header);

  /* NOTE: order of operations is important! */
  if (ttg_iobuf_add(&c->send, c->send.len, NULL, header_len) != 0) {
    p = &c->send.buf[c->send.len - len];        /* p points to data */
    memmove(p, p - header_len, len);            /* Shift data */
    memcpy(p - header_len, header, header_len); /* Prepend header */
    ttg_ws_mask(c, len);                        /* Mask data */
  }
  return c->send.len;
}
