# sysconfdir = @sysconfdir@
# systemdsystemunitdir = @systemdsystemunitdir@

# dist_sysconf_DATA = tinytrack.conf

# if HAVE_SYSTEMD
# systemdsystemunit_DATA = systemd/tinytd.service
# endif

# EXTRA_DIST = systemd/tinytd.service

sysconfdir = @sysconfdir@
dist_sysconf_DATA = tinytrack.conf
EXTRA_DIST = systemd/tinytd.service

if HAVE_SYSTEMD
install-data-hook:
	$(MKDIR_P) $(DESTDIR)/etc/systemd/system
	$(INSTALL_DATA) $(srcdir)/systemd/tinytd.service $(DESTDIR)/etc/systemd/system/tinytd.service
	@echo "Systemd unit installed to /etc/systemd/system/"
	@echo "Run 'systemctl daemon-reload' to reload systemd"

uninstall-hook:
	rm -f $(DESTDIR)/etc/systemd/system/tinytd.service
endif