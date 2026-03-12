SUBDIRS = common tinytd cli gateway tests etc

EXTRA_DIST = README.md INSTALL.md LICENSE

dist_doc_DATA = README.md INSTALL.md LICENSE

# Code formatting
.PHONY: format format-check

format:
	@echo "Formatting code with clang-format..."
	@find common tinytd cli gateway -name '*.c' -o -name '*.h' | xargs clang-format -i

format-check:
	@echo "Checking code formatting..."
	@find common tinytd cli gateway -name '*.c' -o -name '*.h' | xargs clang-format --dry-run --Werror
