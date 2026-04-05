sysconfdir = @sysconfdir@
dist_sysconf_DATA = tinytrack.conf
EXTRA_DIST = tinytrack.conf-docker systemd/tinytd.service systemd/tinytrack.service

if HAVE_SYSTEMD
install-data-hook:
	$(MKDIR_P) $(DESTDIR)/etc/systemd/system
	$(INSTALL_DATA) $(srcdir)/systemd/tinytd.service $(DESTDIR)/etc/systemd/system/tinytd.service
	$(INSTALL_DATA) $(srcdir)/systemd/tinytrack.service $(DESTDIR)/etc/systemd/system/tinytrack.service
	systemctl daemon-reload
	systemctl enable tinytd tinytrack
	systemctl start tinytd tinytrack
	@echo "  tinytd and tinytrack services installed, enabled and started."

uninstall-hook:
	-systemctl stop tinytrack tinytd
	-systemctl disable tinytrack tinytd
	rm -f $(DESTDIR)/etc/systemd/system/tinytd.service
	rm -f $(DESTDIR)/etc/systemd/system/tinytrack.service
	systemctl daemon-reload
	@echo "  tinytd and tinytrack services removed."
endif
