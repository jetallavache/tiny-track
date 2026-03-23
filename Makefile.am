SUBDIRS = common tinytd cli gateway tests etc

EXTRA_DIST = README.md docs/INSTALL.md LICENSE \
             docs/man/tiny-cli.1 docs/man/tinytd.8 \
             scripts/completion/tiny-cli.bash \
             scripts/completion/tiny-cli.zsh \
             scripts/install-extras.sh

dist_doc_DATA = README.md docs/INSTALL.md LICENSE

# Man pages
man1_MANS = docs/man/tiny-cli.1
man8_MANS = docs/man/tinytd.8

# Post-install: create system user/group and data directory
install-data-hook:
	@if ! getent group tinytd > /dev/null 2>&1; then \
		echo "  Creating system group: tinytd"; \
		groupadd --system tinytd; \
	fi
	@if ! getent passwd tinytd > /dev/null 2>&1; then \
		echo "  Creating system user: tinytd"; \
		useradd --system --no-create-home --shell /usr/sbin/nologin --gid tinytd tinytd; \
	fi
	@install -d -m 750 -o tinytd -g tinytd $(DESTDIR)/var/lib/tinytrack
	@echo "  tinytd user/group and /var/lib/tinytrack are ready."
	@if getent group systemd-journal > /dev/null 2>&1; then \
		SUDO_USER=$${SUDO_USER:-$(LOGNAME)}; \
		if [ -n "$$SUDO_USER" ] && ! id -nG "$$SUDO_USER" | grep -qw systemd-journal; then \
			echo "  Adding $$SUDO_USER to systemd-journal group..."; \
			usermod -aG systemd-journal "$$SUDO_USER"; \
			echo "  Re-login required for journal access to take effect."; \
		fi \
	fi

# Post-uninstall: remove runtime files, data directory, user and group
uninstall-hook:
	@echo "  Stopping tinytd if running..."
	@-pkill -x tinytd 2>/dev/null; sleep 1
	@echo "  Removing runtime and data files..."
	@-rm -f /var/run/tinytd.pid
	@-rm -f /dev/shm/tinytd-live.dat
	@-rm -f /var/lib/tinytrack/tinytd-shadow.dat
	@-rmdir /var/lib/tinytrack 2>/dev/null || true
	@if getent passwd tinytd > /dev/null 2>&1; then \
		echo "  Removing user: tinytd"; \
		userdel tinytd; \
	fi
	@if getent group tinytd > /dev/null 2>&1; then \
		echo "  Removing group: tinytd"; \
		groupdel tinytd; \
	fi
	@echo "  Uninstall complete."

# Code formatting
.PHONY: format format-check

format:
	@echo "Formatting code with clang-format..."
	@find common tinytd cli gateway -name '*.c' -o -name '*.h' | xargs clang-format -i

format-check:
	@echo "Checking code formatting..."
	@find common tinytd cli gateway -name '*.c' -o -name '*.h' | xargs clang-format --dry-run --Werror
