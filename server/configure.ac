AC_INIT([tinytrack], [0.1.6], [bugs@example.com])
AC_CONFIG_SRCDIR([tinytd/src/main.c])
AC_CONFIG_HEADERS([config.h])
AM_INIT_AUTOMAKE([-Wall -Werror foreign subdir-objects])

# Переопределяем sysconfdir на /etc
sysconfdir=/etc/tinytrack/
AC_SUBST([sysconfdir])

# Checks for programs
AC_PROG_CC
AC_PROG_RANLIB
AM_PROG_AR

# Check for C11 support
# NOTE: Using -O0 due to GCC optimization bug with pointer aliasing in tinytd
CFLAGS="-std=c11 -D_POSIX_C_SOURCE=200809L -D_GNU_SOURCE -O2"

# Checks for header files
AC_CHECK_HEADERS([fcntl.h stdint.h stdlib.h string.h sys/time.h unistd.h])
AC_CHECK_HEADERS([sys/epoll.h sys/timerfd.h], [],
    [AC_MSG_ERROR([Linux-specific headers required])])

# Checks for typedefs, structures, and compiler characteristics
AC_TYPE_SIZE_T

# Checks for library functions
AC_FUNC_MMAP
AC_CHECK_FUNCS([clock_gettime gettimeofday memset munmap])

# Check for required libraries
AC_CHECK_LIB([rt], [clock_gettime], [],
    [AC_MSG_ERROR([librt is required])])
AC_CHECK_LIB([ncurses], [initscr], [],
    [AC_MSG_ERROR([libncurses is required (install ncurses-devel)])])
AC_CHECK_LIB([crypto], [SHA256_Init], [],
    [AC_MSG_WARN([libcrypto not found, gateway will not be built])])
AC_CHECK_LIB([ssl], [SSL_CTX_new], [],
    [AC_MSG_WARN([libssl not found, TLS support disabled])])

PKG_PROG_PKG_CONFIG

# Check for systemd
AC_ARG_WITH([systemdsystemunitdir],
    [AS_HELP_STRING([--with-systemdsystemunitdir=DIR],
        [Directory for systemd service files])],
    [],
    [with_systemdsystemunitdir=auto])

AS_IF([test "x$with_systemdsystemunitdir" = "xyes" -o "x$with_systemdsystemunitdir" = "xauto"], [
    PKG_CHECK_EXISTS([systemd], [
        systemdsystemunitdir=`$PKG_CONFIG --variable=systemdsystemunitdir systemd`
    ], [
        systemdsystemunitdir=/usr/lib/systemd/system
    ])
], [test "x$with_systemdsystemunitdir" != "xno"], [
    systemdsystemunitdir="$with_systemdsystemunitdir"
])

AC_SUBST([systemdsystemunitdir])
AM_CONDITIONAL([HAVE_SYSTEMD], [test -n "$systemdsystemunitdir"])

# Check for setfacl (acl package) - used for immediate journal access without re-login
AC_PATH_PROG([SETFACL], [setfacl])
AM_CONDITIONAL([HAVE_SETFACL], [test -n "$SETFACL"])
AS_IF([test -z "$SETFACL"],
    [AC_MSG_WARN([setfacl not found; install 'acl' package for immediate journal access after install])])

# Optional features
AC_ARG_ENABLE([debug],
    AS_HELP_STRING([--enable-debug], [Enable debug mode]),
    [enable_debug=$enableval], [enable_debug=no])

if test "x$enable_debug" = "xyes"; then
    AC_DEFINE([DEBUG], [1], [Define to enable debug mode])
    AC_DEFINE([TTD_DEBUG], [1], [Define to enable tinytd debug output])
    CFLAGS="$CFLAGS -g"
fi

# Coverage
AC_ARG_ENABLE([coverage],
    AS_HELP_STRING([--enable-coverage], [Enable gcov code coverage]),
    [enable_coverage=$enableval], [enable_coverage=no])

if test "x$enable_coverage" = "xyes"; then
    AC_CHECK_PROG([GCOV], [gcov], [gcov], [no])
    AC_CHECK_PROG([LCOV], [lcov], [lcov], [no])
    if test "x$GCOV" = "xno"; then
        AC_MSG_ERROR([gcov not found, required for --enable-coverage])
    fi
    CFLAGS="$CFLAGS -g -O0 --coverage"
    LDFLAGS="$LDFLAGS --coverage"
fi
AC_SUBST([GCOV])
AC_SUBST([LCOV])

# Output files
AC_CONFIG_FILES([
    Makefile
    common/Makefile
    tinytd/Makefile
    cli/Makefile
    gateway/Makefile
    tests/Makefile
    etc/Makefile
])

AC_OUTPUT

echo "
  $PACKAGE_NAME $VERSION

  prefix:      ${prefix}
  compiler:    ${CC}
  cflags:      ${CFLAGS}
  ldflags:     ${LDFLAGS}

  debug:       ${enable_debug}
  coverage:    ${enable_coverage}
  setfacl:     ${SETFACL:-not found (re-login required for journal access)}
"
