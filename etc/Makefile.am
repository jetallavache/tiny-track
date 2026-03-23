sysconfdir = @sysconfdir@
dist_sysconf_DATA = tinytrack.conf
EXTRA_DIST = systemd/tinytd.service

if HAVE_SYSTEMD
install-data-hook:
	$(MKDIR_P) $(DESTDIR)/etc/systemd/system
	$(INSTALL_DATA) $(srcdir)/systemd/tinytd.service $(DESTDIR)/etc/systemd/system/tinytd.service
	systemctl daemon-reload
	systemctl enable tinytd
	systemctl start tinytd
	@echo "  tinytd service installed, enabled and started."

uninstall-hook:
	-systemctl stop tinytd
	-systemctl disable tinytd
	rm -f $(DESTDIR)/etc/systemd/system/tinytd.service
	systemctl daemon-reload
	@echo "  tinytd service removed."
endif
