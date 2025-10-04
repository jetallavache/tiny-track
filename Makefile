PROG?= tiny # Program we are building
DELETE= rm -rf # Command to remove files
CC= gcc -std=c2x
OUT?= -o $(PROG) # Compiler argument for output file

SOURCES= $(shell find . -wholename "./src/*.c")	# Source code files
HEADERS= $(shell find . -wholename "./src/*.h")	# Headers files
# OBJECTS= $(notdir $(SOURCES:.c=.o))

CFLAGS= -W -Wall -Wextra -Wpedantic -g -I. # Build options
CFLAGS+= -D_POSIX_C_SOURCE=199309L -D_GNU_SOURCE
# LIBS= `pkg-config --libs mpfr`
LIBS= -lc -lrt -lssl -lcrypto

.PHONY: clean

all: clean build # Default target. Cleanup and build program

build: $(SOURCES) # Build program from sources
	$(CC) $(CFLAGS) $(LIBS) $(OUT) $(SOURCES)

run:							# Run program
	$(RUN) ./$(PROG) $(ARGS)

clean:							# Cleanup. Delete built program and all build artifacts
	rm -f $(PROG) *.o

style_fix:
	clang-format -i --style="{BasedOnStyle: Google}" $(SOURCES) $(HEADERS)
	prettier --write "*.{js,json,css,html}"
cpplint: 
	clang-format -n --style="{BasedOnStyle: Google}" --verbose $(SOURCES) $(HEADERS)
cppcheck:
	cppcheck --enable=all --force --suppress=missingIncludeSystem --language=c $(SOURCES) $(HEADERS)
valgrind: build
	valgrind --leak-check=full --show-leak-kinds=all --track-origins=yes --verbose ./$(PROG)