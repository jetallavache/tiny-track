bin_PROGRAMS = tiny-cli

tiny_cli_SOURCES = \
	src/main.c \
	src/reader.c src/reader.h \
	src/display.c src/display.h \
	src/commands.c src/commands.h

tiny_cli_CFLAGS = -I$(top_srcdir) $(AM_CFLAGS)
tiny_cli_LDADD = $(top_builddir)/common/libcommon.a -lrt
