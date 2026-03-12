sysconfdir = @sysconfdir@
systemdsystemunitdir = @systemdsystemunitdir@

dist_sysconf_DATA = tinytrack.conf

if HAVE_SYSTEMD
systemdsystemunit_DATA = systemd/tinytd.service
endif

EXTRA_DIST = systemd/tinytd.service
