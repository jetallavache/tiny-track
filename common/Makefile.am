noinst_LIBRARIES = libcommon.a

libcommon_a_SOURCES = \
	ringbuf/shm.c ringbuf/shm.h \
	ringbuf/writer.c ringbuf/writer.h \
	ringbuf/reader.c ringbuf/reader.h \
	ringbuf/layout.h \
	ringbuf.h \
	metrics.c metrics.h \
	log/core.c \
	log/stderr.c \
	log/syslog.c \
	log/journal.c \
	log.h \
	log_internal.h \
	config/ini.c config/ini.h \
	config/paths.c config/paths.h \
	config/read.c config/read.h \
	config.h \
	timer.c timer.h \
	proto/v1.h

libcommon_a_CFLAGS = -I$(top_srcdir)
