sysconfdir = @sysconfdir@
dist_sysconf_DATA = tinytrack.conf
EXTRA_DIST = tinytrack.conf-docker systemd/tinytd.service systemd/tinytrack.service

if HAVE_SYSTEMD
install-data-hook:
	$(MKDIR_P) $(DESTDIR)/etc/systemd/system
	$(MKDIR_P) $(DESTDIR)/etc/systemd/system/tinytrack.service.d
	$(INSTALL_DATA) $(srcdir)/systemd/tinytd.service $(DESTDIR)/etc/systemd/system/tinytd.service
	$(INSTALL_DATA) $(srcdir)/systemd/tinytrack.service $(DESTDIR)/etc/systemd/system/tinytrack.service
	@echo "  Token setup tinytrack.service"
	@read -s -p "Enter your authentication token: " TOKEN; \
	echo; \
	if [ -n "$$TOKEN" ]; then \
		sudo mkdir -p /etc/systemd/system/tinytrack.service.d/; \
		( \
			echo "[Service]"; \
			echo "$$TOKEN" | sudo systemd-creds encrypt --name=auth_token -p - -; \
			echo ""; \
			echo "Environment=\"AUTH_TOKEN_PATH=%d/auth_token\""; \
		) | sudo tee /etc/systemd/system/tinytrack.service.d/50-auth-token.conf > /dev/null; \
		echo "  Token has been securely stored."; \
	else \
		echo "  No token provided. Skipping authentication setup."; \
	fi
	systemctl daemon-reload
	systemctl enable tinytd tinytrack
	systemctl start tinytd tinytrack
	@echo "  tinytd and tinytrack services installed, enabled and started."

uninstall-hook:
	-systemctl stop tinytrack tinytd
	-systemctl disable tinytrack tinytd
	rm -f $(DESTDIR)/etc/systemd/system/tinytd.service
	rm -f $(DESTDIR)/etc/systemd/system/tinytrack.service
	@if [ -f /etc/systemd/system/tinytrack.service.d/50-auth-token.conf ]; then \
		sudo rm -f /etc/systemd/system/tinytrack.service.d/50-auth-token.conf; \
		echo "  Token configuration removed."; \
	else \
		echo "  Token configuration file not found."; \
	fi
	@-rmdir /etc/systemd/system/tinytrack.service.d 2>/dev/null || true
	systemctl daemon-reload
	@echo "  tinytd and tinytrack services removed."
endif
