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

# Code formatting
.PHONY: format format-check

format:
	@echo "Formatting code with clang-format..."
	@find common tinytd cli gateway -name '*.c' -o -name '*.h' | xargs clang-format -i

format-check:
	@echo "Checking code formatting..."
	@find common tinytd cli gateway -name '*.c' -o -name '*.h' | xargs clang-format --dry-run --Werror
