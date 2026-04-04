BUILD
=====

REQUIREMENTS
------------

  gcc >= 9
  make
  autoconf >= 2.69
  automake >= 1.15
  libtool
  libssl-dev      (OpenSSL)
  libncurses-dev  (ncurses dashboard)

Ubuntu/Debian:

  sudo apt install gcc make autoconf automake libtool \
      libssl-dev libncurses-dev

openSUSE:

  sudo zypper install gcc make autoconf automake libtool \
      libopenssl-devel ncurses-devel

Fedora/RHEL:

  sudo dnf install gcc make autoconf automake libtool \
      openssl-devel ncurses-devel


BUILD
-----

After cloning from git:

  ./bootstrap.sh
  ./configure
  make -j$(nproc)

Binaries are placed in:

  tinytd/tinytd
  gateway/tinytrack
  cli/tiny-cli


CONFIGURE OPTIONS
-----------------

  ./configure CFLAGS="-g -O0"   debug build
  ./configure --without-systemd  disable systemd journal backend
  ./configure --prefix=/opt/tinytrack


INSTALL
-------

  sudo make install
  sudo make uninstall


CLEAN
-----

  make clean        remove object files
  make distclean    remove everything including configure
  sh scripts/clean.sh   full cleanup including test artifacts


DISTRIBUTION CHECK
------------------

  make distcheck
