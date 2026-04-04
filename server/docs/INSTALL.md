INSTALL
=======

REQUIREMENTS
------------

  Linux kernel >= 4.x
  gcc >= 9, make, autoconf, automake
  libssl-dev, libncurses-dev
  systemd (optional, for service management)

See BUILD.md for build instructions.


SYSTEM USERS
------------

The install target creates system users automatically:

  groupadd --system tinytd
  useradd --system --no-create-home --shell /usr/sbin/nologin \
      --gid tinytd tinytd

  groupadd --system tinytrack
  useradd --system --no-create-home --shell /usr/sbin/nologin \
      --gid tinytrack tinytrack

Data directory: /var/lib/tinytrack/  (owned by tinytd:tinytd)


INSTALL
-------

  sudo make install

Installed files:

  /usr/local/bin/tinytd
  /usr/local/bin/tinytrack
  /usr/local/bin/tiny-cli
  /etc/tinytrack/tinytrack.conf
  /etc/systemd/system/tinytd.service
  /etc/systemd/system/tinytrack.service
  /usr/local/share/man/man1/tiny-cli.1
  /usr/local/share/man/man8/tinytd.8
  /usr/local/share/man/man8/tinytrack.8


START
-----

  sudo systemctl enable tinytd tinytrack
  sudo systemctl start tinytd tinytrack
  systemctl status tinytd tinytrack


USER ACCESS
-----------

To use tiny-cli without root:

  sudo usermod -aG tinytd $USER
  newgrp tinytd


CONFIGURATION
-------------

Edit /etc/tinytrack/tinytrack.conf and restart:

  sudo systemctl restart tinytd tinytrack

See CONFIGURATION.md for all parameters.


UNINSTALL
---------

  sudo systemctl stop tinytd tinytrack
  sudo make uninstall
