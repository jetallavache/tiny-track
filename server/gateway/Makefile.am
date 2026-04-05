bin_PROGRAMS = tinytrack

# Gateway integration tests
GATEWAY_TEST_PORT = 4028
GATEWAY_TEST_CONF = $(top_srcdir)/tests/tinytrack.conf-test

.PHONY: check-gateway check-gateway-extended

check-gateway: tinytrack
	@command -v node >/dev/null 2>&1 || { echo "node not found"; exit 1; }
	@cd $(abs_top_srcdir)/tests/gateway; \
	  $(abs_top_builddir)/tinytd/tinytd -c $(abs_top_srcdir)/tests/tinytrack.conf-test 2>/dev/null & TDPID=$$!; \
	  sleep 2; \
	  $(abs_top_builddir)/gateway/tinytrack -c $(abs_top_srcdir)/tests/tinytrack.conf-test -p $(GATEWAY_TEST_PORT) 2>/dev/null & GWPID=$$!; \
	  sleep 1; \
	  node test_gateway.js ws://127.0.0.1:$(GATEWAY_TEST_PORT)/websocket; STATUS=$$?; \
	  kill $$GWPID $$TDPID 2>/dev/null; wait $$GWPID $$TDPID 2>/dev/null; \
	  exit $$STATUS

check-gateway-extended: tinytrack
	@command -v node >/dev/null 2>&1 || { echo "node not found"; exit 1; }
	@cd $(abs_top_srcdir)/tests/gateway; \
	  $(abs_top_builddir)/tinytd/tinytd -c $(abs_top_srcdir)/tests/tinytrack.conf-test 2>/dev/null & TDPID=$$!; \
	  sleep 2; \
	  $(abs_top_builddir)/gateway/tinytrack -c $(abs_top_srcdir)/tests/tinytrack.conf-test -p $(GATEWAY_TEST_PORT) 2>/dev/null & GWPID=$$!; \
	  sleep 1; \
	  node test_gateway_extended.js ws://127.0.0.1:$(GATEWAY_TEST_PORT)/websocket; STATUS=$$?; \
	  kill $$GWPID $$TDPID 2>/dev/null; wait $$GWPID $$TDPID 2>/dev/null; \
	  exit $$STATUS

tinytrack_SOURCES = \
	src/main.c \
	src/proto.c src/proto.h \
	src/config.c src/config.h \
	src/session.c src/session.h \
	src/b64.c src/b64.h \
	src/reader.c src/reader.h \
	src/net.c src/net.h \
	src/http.c src/http.h \
	src/ws.c src/ws.h \
	src/sock.c src/sock.h \
	src/tls.c src/tls.h \
	src/event.c src/event.h \
	src/iobuf.c src/iobuf.h \
	src/printf.c src/printf.h \
	src/url.c src/url.h \
	src/str.c src/str.h \
	src/util.c src/url.h

tinytrack_CFLAGS = -I$(top_srcdir) $(AM_CFLAGS)
tinytrack_LDADD = $(top_builddir)/common/libcommon.a -lrt -lssl -lcrypto
