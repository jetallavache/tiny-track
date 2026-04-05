#!/bin/sh
# setup-test-env.sh — Автоматическая настройка окружения для запуска тестов.
#
# Использование (из корня проекта):
#   sh scripts/setup-test-env.sh [--no-build]
#
# Флаги:
#   --no-build   Только установить зависимости, не собирать проект

set -e
cd "$(dirname "$0")/.."

NO_BUILD=0
for arg in "$@"; do
    [ "$arg" = "--no-build" ] && NO_BUILD=1
done

GREEN='\033[32m'; YELLOW='\033[33m'; RED='\033[31m'; RESET='\033[0m'
info()  { printf "${GREEN}[setup]${RESET} %s\n" "$*"; }
warn()  { printf "${YELLOW}[warn]${RESET}  %s\n" "$*"; }
error() { printf "${RED}[error]${RESET} %s\n" "$*"; exit 1; }

check() { command -v "$1" >/dev/null 2>&1; }

# --------------------------------------------------------------------------
# Определяем дистрибутив
# --------------------------------------------------------------------------
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif check lsb_release; then
        lsb_release -si | tr '[:upper:]' '[:lower:]'
    else
        echo "unknown"
    fi
}

DISTRO=$(detect_distro)
info "Дистрибутив: $DISTRO"

# --------------------------------------------------------------------------
# Установка системных пакетов
# --------------------------------------------------------------------------
install_packages() {
    case "$DISTRO" in
        opensuse*|sles)
            info "Установка пакетов через zypper..."
            sudo zypper install -y --no-recommends \
                gcc make autoconf automake libtool pkg-config \
                openssl openssl-devel \
                python3 python3-pip \
                nodejs npm \
                cppcheck valgrind 2>/dev/null || true
            ;;
        ubuntu|debian|linuxmint|pop)
            info "Установка пакетов через apt..."
            sudo apt-get update -qq
            sudo apt-get install -y \
                gcc make autoconf automake libtool pkg-config \
                openssl libssl-dev \
                python3 python3-pip \
                nodejs npm \
                cppcheck valgrind 2>/dev/null || true
            ;;
        fedora|rhel|centos|rocky|almalinux)
            info "Установка пакетов через dnf..."
            sudo dnf install -y \
                gcc make autoconf automake libtool pkg-config \
                openssl openssl-devel \
                python3 python3-pip \
                nodejs npm \
                cppcheck valgrind 2>/dev/null || true
            ;;
        arch|manjaro)
            info "Установка пакетов через pacman..."
            sudo pacman -S --noconfirm --needed \
                gcc make autoconf automake libtool pkg-config \
                openssl \
                python python-pip \
                nodejs npm \
                cppcheck valgrind 2>/dev/null || true
            ;;
        *)
            warn "Неизвестный дистрибутив '$DISTRO'. Установите зависимости вручную."
            warn "Требуются: gcc make autoconf automake openssl python3 nodejs npm"
            ;;
    esac
}

install_packages

# --------------------------------------------------------------------------
# Проверка обязательных инструментов
# --------------------------------------------------------------------------
info "Проверка обязательных инструментов..."
MISSING=""
for tool in gcc make autoconf automake openssl python3; do
    if check "$tool"; then
        printf "  %-12s OK\n" "$tool"
    else
        printf "  %-12s MISSING\n" "$tool"
        MISSING="$MISSING $tool"
    fi
done

if [ -n "$MISSING" ]; then
    error "Не найдены обязательные инструменты:$MISSING"
fi

# --------------------------------------------------------------------------
# Python зависимости
# --------------------------------------------------------------------------
info "Установка Python-зависимостей..."
if check pip3; then
    pip3 install --user --quiet pytest websockets 2>/dev/null || \
    pip3 install --quiet pytest websockets 2>/dev/null || \
    warn "Не удалось установить Python-пакеты через pip3"
elif check pip; then
    pip install --user --quiet pytest websockets 2>/dev/null || \
    warn "Не удалось установить Python-пакеты через pip"
else
    warn "pip не найден. Установите pytest вручную: python3 -m pip install pytest"
fi

# Проверяем pytest
if python3 -m pytest --version >/dev/null 2>&1; then
    printf "  %-12s OK (%s)\n" "pytest" "$(python3 -m pytest --version 2>&1 | head -1)"
else
    warn "pytest не найден. Запустите: pip install pytest"
fi

# --------------------------------------------------------------------------
# Node.js зависимости
# --------------------------------------------------------------------------
if check node && check npm; then
    info "Установка Node.js-зависимостей для gateway тестов..."
    if [ -f tests/gateway/package.json ]; then
        (cd tests/gateway && npm install --silent 2>/dev/null) && \
            printf "  %-12s OK\n" "ws (npm)" || \
            warn "npm install не удался"
    fi
else
    warn "node/npm не найдены. JS тесты будут пропущены."
fi

# --------------------------------------------------------------------------
# Сборка проекта
# --------------------------------------------------------------------------
if [ "$NO_BUILD" -eq 0 ]; then
    info "Сборка проекта..."

    if [ ! -f configure ]; then
        info "Запуск bootstrap.sh..."
        sh bootstrap.sh
    fi

    if [ ! -f Makefile ] || [ configure.ac -nt Makefile ]; then
        info "Запуск configure..."
        ./configure
    fi

    info "Запуск make..."
    make -j"$(nproc 2>/dev/null || echo 2)"

    # Проверяем бинарники
    info "Проверка собранных бинарников..."
    for bin in tinytd/tinytd gateway/tinytrack cli/tiny-cli; do
        if [ -x "$bin" ]; then
            printf "  %-20s OK\n" "$bin"
        else
            warn "Бинарник не найден: $bin"
        fi
    done
fi

# --------------------------------------------------------------------------
# Итог
# --------------------------------------------------------------------------
printf "\n"
info "Окружение готово. Запуск тестов:"
printf "\n"
printf "  sh tests/run_tests.sh              # быстрые тесты (static + tinytd + cli)\n"
printf "  sh tests/run_tests.sh gateway      # gateway тесты (требует запущенных серверов)\n"
printf "  sh tests/run_tests.sh all          # все тесты\n"
printf "\n"
printf "  Документация: docs/TESTING.md\n"
