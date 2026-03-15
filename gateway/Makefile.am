bin_PROGRAMS = tinytrack

tinytrack_SOURCES = \
	src/main.c \
	src/b64.c src/b64.h \
	src/reader.c src/reader.h \
	src/net.c src/net.h \
	src/http.c src/http.h \
	src/ws.c src/ws.h \
	src/sock.c src/sock.h \
	src/event.c src/event.h \
	src/iobuf.c src/iobuf.h \
	src/printf.c src/printf.h \
	src/url.c src/url.h \
	src/str.c src/str.h \
	src/util.c src/url.h

tinytrack_CFLAGS = -I$(top_srcdir) $(AM_CFLAGS)
tinytrack_LDADD = $(top_builddir)/common/libcommon.a -lrt -lcrypto
