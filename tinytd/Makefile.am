bin_PROGRAMS = tinytd

tinytd_SOURCES = \
	src/main.c \
	src/runtime.c src/runtime.h \
	src/collector.c src/collector.h \
	src/config.c src/config.h \
	src/writer.c src/writer.h

tinytd_CFLAGS = -I$(top_srcdir) $(AM_CFLAGS)
tinytd_LDADD = $(top_builddir)/common/libcommon.a -lrt
