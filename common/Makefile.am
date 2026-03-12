noinst_LIBRARIES = libcommon.a

libcommon_a_SOURCES = \
	ring/shm.c ring/shm.h \
	ring/writer.c ring/writer.h \
	ring/reader.c ring/reader.h \
	ring/layout.h \
	sink/core.c \
	sink/stderr.c \
	sink/syslog.c \
	sink/journal.c \
	sink/log.h \
	sink/log_internal.h \
	config/ini.c config/ini.h \
	config/paths.c config/paths.h \
	config/reader.c config/reader.h \
	utils/str.c utils/str.h \
	utils/util.c utils/util.h \
	utils/b64.c utils/b64.h \
	timer.c timer.h \
	proto/v1.h

libcommon_a_CFLAGS = -I$(top_srcdir)
