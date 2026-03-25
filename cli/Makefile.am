bin_PROGRAMS = tiny-cli

tiny_cli_SOURCES = \
	src/main.c \
	src/ctx.c src/ctx.h \
	src/config.c src/config.h \
	src/output.c src/output.h \
	src/commands.c src/commands.h \
	src/dashboard.c src/dashboard.h \
	src/reader.c src/reader.h

tiny_cli_CFLAGS = -I$(top_srcdir) $(AM_CFLAGS)
tiny_cli_LDADD = $(top_builddir)/common/libcommon.a -lrt -lncurses
