#!/bin/sh
# run_static.sh - Static analysis: cppcheck + clang scan-build.
#
# Usage: sh tests/static/run_static.sh
# Run from project root.

set -u

PASS="\033[32mPASS\033[0m"
FAIL="\033[31mFAIL\033[0m"
SKIP="\033[33mSKIP\033[0m"

fail=0

check_tool() { command -v "$1" >/dev/null 2>&1; }

SRC_DIRS="common tinytd/src cli/src gateway/src"

echo "=== static analysis ==="

# --- cppcheck -------------------------------------------------------------
echo "\n[cppcheck]"
if check_tool cppcheck; then
    # shellcheck disable=SC2086
    cppcheck --enable=all \
             --suppress=missingIncludeSystem \
             --suppress=unusedFunction \
             --suppress=constVariablePointer \
             --suppress=constParameterPointer \
             --suppress=variableScope \
             --suppress=staticFunction \
             --suppress=normalCheckLevelMaxBranches \
             --suppress=unreadVariable:gateway/src/printf.c \
             --suppress=unusedVariable:gateway/src/sock.c \
             --error-exitcode=1 \
             --std=c11 \
             -I. \
             $SRC_DIRS \
             2>/tmp/tt-cppcheck.log

    rc=$?
    if [ $rc -eq 0 ]; then
        printf "  [${PASS}] cppcheck: no errors\n"
    else
        printf "  [${FAIL}] cppcheck: errors found\n"
        cat /tmp/tt-cppcheck.log
        fail=$((fail + 1))
    fi
else
    printf "  [${SKIP}] cppcheck not installed (apt install cppcheck)\n"
fi

# --- clang scan-build -----------------------------------------------------
echo "\n[clang scan-build]"
if check_tool scan-build; then
    scan-build --status-bugs \
               -o /tmp/tt-scan-build-report \
               make -C . all \
               >/tmp/tt-scan-build.log 2>&1
    rc=$?
    if [ $rc -eq 0 ]; then
        printf "  [${PASS}] scan-build: no bugs\n"
    else
        printf "  [${FAIL}] scan-build: bugs found (see /tmp/tt-scan-build-report)\n"
        grep -E "^.*warning:|^.*error:" /tmp/tt-scan-build.log | head -20
        fail=$((fail + 1))
    fi
else
    printf "  [${SKIP}] scan-build not installed (apt install clang-tools)\n"
fi

# --- Compile with -Wall -Wextra -Werror -----------------------------------
# gateway/src uses a custom printf with %M specifier and has known
# format-string warnings that are intentional — checked separately by make.
# We only strict-check common/, tinytd/src, cli/src here.
STRICT_DIRS="common tinytd/src cli/src"
echo "\n[compile -Wall -Wextra -Werror ($STRICT_DIRS)]"
if check_tool gcc; then
    CFLAGS_STRICT="-std=c11 -O1 -Wall -Wextra -Werror \
                   -Wstrict-prototypes \
                   -fstack-protector-strong -D_FORTIFY_SOURCE=2 \
                   -D_POSIX_C_SOURCE=200809L -D_GNU_SOURCE \
                   -include config.h \
                   -I. -c"

    err=0
    for dir in $STRICT_DIRS; do
        for f in "$dir"/*.c; do
            [ -f "$f" ] || continue
            # shellcheck disable=SC2086
            if ! gcc $CFLAGS_STRICT "$f" -o /dev/null 2>/tmp/tt-wall.log; then
                printf "  [${FAIL}] %s\n" "$f"
                cat /tmp/tt-wall.log
                err=$((err + 1))
            fi
        done
    done

    if [ $err -eq 0 ]; then
        printf "  [${PASS}] all sources compile cleanly\n"
    else
        fail=$((fail + err))
    fi
else
    printf "  [${SKIP}] gcc not found\n"
fi

echo ""
if [ "$fail" -eq 0 ]; then
    printf "[${PASS}] Static analysis passed\n"
else
    printf "[${FAIL}] %d issue(s) found\n" "$fail"
fi

[ "$fail" -eq 0 ]
