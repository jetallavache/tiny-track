PROG?= tinytd
DELETE= rm -rf
CC= gcc -std=c2x
OUT?= -o $(PROG)

SOURCES= ring.c tinytd.c
HEADERS= ring.h

CFLAGS= -W -Wall -Wextra -Wpedantic -g -I.
CFLAGS+= -D_POSIX_C_SOURCE=199309L -D_GNU_SOURCE
LIBS= -lc -lrt -lssl -lcrypto

.PHONY: clean

all: clean build

build: $(SOURCES)
	$(CC) $(CFLAGS) $(LIBS) $(OUT) $(SOURCES)

clean:
	rm -f $(PROG) *.o