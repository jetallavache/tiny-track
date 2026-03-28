SUBDIRS = common tinytd cli gateway tests etc

EXTRA_DIST = README.md docs/INSTALL.md LICENSE \
             docs/man/tiny-cli.1 docs/man/tinytd.8 docs/man/tinytrack.8 \
             scripts/completion/tiny-cli.bash \
             scripts/completion/tiny-cli.zsh \
             scripts/install-extras.sh

dist_doc_DATA = README.md docs/INSTALL.md LICENSE

# Man pages
man1_MANS = docs/man/tiny-cli.1
man8_MANS = docs/man/tinytd.8 docs/man/tinytrack.8

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
	@if ! getent group tinytrack > /dev/null 2>&1; then \
		echo "  Creating system group: tinytrack"; \
		groupadd --system tinytrack; \
	fi
	@if ! getent passwd tinytrack > /dev/null 2>&1; then \
		echo "  Creating system user: tinytrack"; \
		useradd --system --no-create-home --shell /usr/sbin/nologin --gid tinytrack tinytrack; \
	fi
	@install -d -m 750 -o tinytd -g tinytd $(DESTDIR)/var/lib/tinytrack
	@usermod -aG tinytd tinytrack
	@echo "  tinytd user/group and /var/lib/tinytrack are ready."
	@SUDO_USER=$${SUDO_USER:-$(LOGNAME)}; \
	if [ -n "$$SUDO_USER" ] && [ "$$SUDO_USER" != "root" ]; then \
		if ! id -nG "$$SUDO_USER" | grep -qw tinytd; then \
			echo "  Adding $$SUDO_USER to tinytd group (for tiny-cli access)..."; \
			usermod -aG tinytd "$$SUDO_USER"; \
			echo ""; \
			echo "  *** ACTION REQUIRED ***"; \
			echo "  Group membership takes effect after re-login."; \
			echo "  To apply immediately in the current session, run:"; \
			echo "    newgrp tinytd"; \
			echo ""; \
		fi; \
		if getent group systemd-journal > /dev/null 2>&1; then \
			if ! id -nG "$$SUDO_USER" | grep -qw systemd-journal; then \
				echo "  Adding $$SUDO_USER to systemd-journal group..."; \
				usermod -aG systemd-journal "$$SUDO_USER"; \
			fi; \
		fi; \
		if command -v setfacl > /dev/null 2>&1; then \
			echo "  Granting $$SUDO_USER immediate journal read access via ACL..."; \
			for jdir in /run/log/journal /var/log/journal; do \
				if [ -d "$$jdir" ]; then \
					setfacl -m u:"$$SUDO_USER":rx "$$jdir" 2>/dev/null || true; \
					find "$$jdir" -mindepth 1 -maxdepth 1 -type d | while read d; do \
						setfacl -m u:"$$SUDO_USER":rx "$$d" 2>/dev/null || true; \
						setfacl -Rm u:"$$SUDO_USER":r "$$d"/*.journal* 2>/dev/null || true; \
					done; \
				fi; \
			done; \
			echo "  Journal access granted (no re-login required)."; \
		else \
			echo "  Note: re-login required for systemd-journal group to take effect."; \
		fi; \
	fi

# Post-uninstall: remove runtime files, data directory, user and group
uninstall-hook:
	@echo "  Stopping tinytd if running..."
	@-pkill -x tinytd 2>/dev/null; sleep 1
	@-pkill -x tinytrack 2>/dev/null; sleep 1
	@echo "  Removing runtime and data files..."
	@-rm -f /var/run/tinytd.pid
	@-rm -f /var/run/tinytrack.pid
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
	@if getent passwd tinytrack > /dev/null 2>&1; then \
		echo "  Removing user: tinytrack"; \
		userdel tinytrack; \
	fi
	@if getent group tinytrack > /dev/null 2>&1; then \
		echo "  Removing group: tinytrack"; \
		groupdel tinytrack; \
	fi
	@SUDO_USER=$${SUDO_USER:-$(LOGNAME)}; \
	if [ -n "$$SUDO_USER" ] && [ "$$SUDO_USER" != "root" ]; then \
		if id -nG "$$SUDO_USER" | grep -qw tinytd; then \
			echo "  Removing $$SUDO_USER from tinytd group..."; \
			gpasswd -d "$$SUDO_USER" tinytd 2>/dev/null || true; \
		fi; \
		if id -nG "$$SUDO_USER" | grep -qw systemd-journal; then \
			echo "  Removing $$SUDO_USER from systemd-journal group..."; \
			gpasswd -d "$$SUDO_USER" systemd-journal 2>/dev/null || true; \
		fi; \
		if command -v setfacl > /dev/null 2>&1; then \
			for jdir in /run/log/journal /var/log/journal; do \
				if [ -d "$$jdir" ]; then \
					setfacl -x u:"$$SUDO_USER" "$$jdir" 2>/dev/null || true; \
					find "$$jdir" -mindepth 1 -maxdepth 1 -type d | while read d; do \
						setfacl -x u:"$$SUDO_USER" "$$d" 2>/dev/null || true; \
						setfacl -Rx u:"$$SUDO_USER" "$$d"/*.journal* 2>/dev/null || true; \
					done; \
				fi; \
			done; \
		fi; \
	fi
	@-rmdir /etc/tinytrack 2>/dev/null || true
	@echo "  Uninstall complete."

# Code formatting
.PHONY: format format-check valgrind-tinytd valgrind-cli valgrind-gateway coverage coverage-clean \
        check-gateway check-gateway-extended

check-gateway:
	$(MAKE) -C gateway check-gateway

check-gateway-extended:
	$(MAKE) -C gateway check-gateway-extended

format:
	@echo "Formatting code with clang-format..."
	@find common tinytd cli gateway -name '*.c' -o -name '*.h' | xargs clang-format -i

format-check:
	@echo "Checking code formatting..."
	@find common tinytd cli gateway -name '*.c' -o -name '*.h' | xargs clang-format --dry-run --Werror

# Valgrind memory check — runs tinytd for 5s with test config
valgrind-tinytd:
	@command -v valgrind >/dev/null 2>&1 || { echo "valgrind not found"; exit 1; }
	@test -f tinytd/tinytd || { echo "Run 'make' first"; exit 1; }
	@echo "Running valgrind on tinytd (5s)..."
	@valgrind \
	  --tool=memcheck \
	  --leak-check=full \
	  --show-leak-kinds=all \
	  --track-origins=yes \
	  --error-exitcode=1 \
	  --log-file=valgrind-tinytd.log \
	  timeout 5 tinytd/tinytd -c tests/tinytd-test.conf; true
	@echo "Valgrind report: valgrind-tinytd.log"
	@grep -E "ERROR SUMMARY|definitely lost|indirectly lost|possibly lost" valgrind-tinytd.log

# Valgrind memory check — runs tiny-cli status against live tinytd
valgrind-cli:
	@command -v valgrind >/dev/null 2>&1 || { echo "valgrind not found"; exit 1; }
	@test -f cli/tiny-cli || { echo "Run 'make' first"; exit 1; }
	@test -f tinytd/tinytd || { echo "Run 'make' first"; exit 1; }
	@echo "Starting tinytd..."
	@tinytd/tinytd -c tests/tinytd-test.conf 2>/dev/null & TDPID=$$!; \
	  i=0; while [ $$i -lt 20 ] && [ ! -f /tmp/tinytd-test-live.dat ]; do sleep 0.5; i=$$((i+1)); done; \
	  echo "Running valgrind on tiny-cli..."; \
	  valgrind \
	    --tool=memcheck \
	    --leak-check=full \
	    --show-leak-kinds=all \
	    --track-origins=yes \
	    --error-exitcode=42 \
	    --log-file=valgrind-tiny-cli.log \
	    cli/tiny-cli -p /tmp/tinytd-test-live.dat -c tests/tinytd-test.conf status; STATUS=$$?; \
	  kill $$TDPID 2>/dev/null; wait $$TDPID 2>/dev/null; \
	  echo "Valgrind report: valgrind-tiny-cli.log"; \
	  grep -E "ERROR SUMMARY|definitely lost|indirectly lost|possibly lost" valgrind-tiny-cli.log; \
	  [ $$STATUS -eq 42 ] && exit 1 || exit 0

# Valgrind memory check — runs tinytrack gateway for 5s with a WS client
valgrind-gateway:
	@command -v valgrind >/dev/null 2>&1 || { echo "valgrind not found"; exit 1; }
	@test -f gateway/tinytrack || { echo "Run 'make' first"; exit 1; }
	@test -f tinytd/tinytd || { echo "Run 'make' first"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "node not found"; exit 1; }
	@echo "Starting tinytd..."
	@tinytd/tinytd -c tests/tinytd-test.conf 2>/dev/null & TDPID=$$!; \
	  i=0; while [ $$i -lt 20 ] && [ ! -f /tmp/tinytd-test-live.dat ]; do sleep 0.5; i=$$((i+1)); done; \
	  echo "Running valgrind on tinytrack (gateway)..."; \
	  valgrind \
	    --tool=memcheck \
	    --leak-check=full \
	    --show-leak-kinds=all \
	    --track-origins=yes \
	    --error-exitcode=42 \
	    --log-file=valgrind-tinytrack.log \
	    gateway/tinytrack -c tests/tinytd-test.conf -p 4037 2>/dev/null & GWPID=$$!; \
	  sleep 2; \
	  cd gateway/tests; node test_gateway.js ws://127.0.0.1:4037/websocket; cd ../..; \
	  sleep 1; \
	  kill $$GWPID 2>/dev/null; wait $$GWPID 2>/dev/null; STATUS=$$?; \
	  kill $$TDPID 2>/dev/null; wait $$TDPID 2>/dev/null; \
	  echo "Valgrind report: valgrind-tinytrack.log"; \
	  grep -E "ERROR SUMMARY|definitely lost|indirectly lost|possibly lost" valgrind-tinytrack.log; \
	  [ $$STATUS -eq 42 ] && exit 1 || exit 0

# Coverage — requires ./configure --enable-coverage && make
COVERAGE_DIR = coverage-report

coverage:
	@test -f common/ringbuf/libcommon_a-writer.gcno || \
	  { echo "Rebuild with: ./configure --enable-coverage && make"; exit 1; }
	@echo "Running daemons for coverage data..."
	@timeout 10 tinytd/tinytd -c tests/tinytd-test.conf 2>/dev/null & \
	  TDPID=$$!; sleep 3; \
	  cli/tiny-cli -c tests/tinytd-test.conf status  2>/dev/null; \
	  cli/tiny-cli -c tests/tinytd-test.conf debug   2>/dev/null; \
	  cli/tiny-cli -c tests/tinytd-test.conf metrics 2>/dev/null; \
	  gateway/tinytrack -c tests/tinytd-test.conf & GWPID=$$!; sleep 2; \
	  kill $$GWPID 2>/dev/null; wait $$GWPID 2>/dev/null; \
	  kill $$TDPID 2>/dev/null; wait $$TDPID 2>/dev/null; true
	@echo "Collecting coverage..."
	@mkdir -p $(COVERAGE_DIR)
	@if command -v lcov >/dev/null 2>&1; then \
	  lcov --capture --directory . --output-file $(COVERAGE_DIR)/coverage.info \
	       --exclude '/usr/*' --ignore-errors unused --quiet && \
	  lcov --list $(COVERAGE_DIR)/coverage.info && \
	  { command -v genhtml >/dev/null 2>&1 && \
	    genhtml $(COVERAGE_DIR)/coverage.info --output-directory $(COVERAGE_DIR)/html --quiet && \
	    echo "HTML report: $(COVERAGE_DIR)/html/index.html" || true; }; \
	else \
	  find . -name '*.gcda' | while read f; do \
	    dir=$$(dirname $$f); base=$$(basename $$f .gcda); \
	    result=$$(cd "$$dir" && $(GCOV) -b "$$base.gcda" 2>/dev/null | grep -E "Lines executed|Branches executed|строк|переходов"); \
	    [ -n "$$result" ] && echo "--- $$base ---" && echo "$$result" || true; \
	  done; \
	fi

coverage-clean:
	find . -name '*.gcda' -o -name '*.gcno' | xargs rm -f 2>/dev/null; true
	rm -rf $(COVERAGE_DIR)
