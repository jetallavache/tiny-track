# TinyTrack — Руководство по тестированию

## Структура тестов

```
tests/
├── tinytd/          # Тесты для tinytd (демон) и common-библиотек
│   ├── test_config.c        # unit: парсер INI-конфига
│   ├── test_metrics.c       # unit: агрегация метрик
│   ├── test_ringbuf.c       # unit: кольцевой буфер (writer/reader)
│   ├── test_shm.c           # unit: shared memory (shm_create/read)
│   ├── test_seqlock.c       # integration: seqlock под нагрузкой
│   ├── test_shadow_sync.c   # integration: синхронизация shadow-файла
│   ├── test_shm_ipc.c       # integration: IPC через shared memory
│   ├── test_smoke.sh        # system: smoke-тест (запуск/остановка)
│   ├── test_signals.sh      # system: обработка сигналов (HUP, USR1, KILL)
│   └── test_perf.sh         # system: производительность под нагрузкой
│
├── cli/             # Тесты для tiny-cli
│   ├── test_cli_output.c    # unit: форматирование вывода (fmt_bytes, fmt_ts, цвета)
│   ├── test_cli_config.c    # unit: загрузка конфига CLI
│   └── test_cli_binary.sh   # integration: тест бинарника tiny-cli
│
├── gateway/         # Тесты для tinytrack (gateway)
│   ├── conftest.py          # pytest fixtures: запуск tinytd + tinytrack
│   ├── test_ws.py           # WebSocket протокол (connect, send, recv, close)
│   ├── test_http.py         # HTTP API (/api/metrics/live, 404, WS upgrade)
│   ├── test_tls.py          # TLS handshake и зашифрованный WS
│   ├── test_sock.py         # socket/epoll корректность (EPOLLIN, EPOLLHUP, ET)
│   ├── test_load.py         # нагрузочные тесты (200 concurrent WS, FD leak)
│   ├── test_gateway.js      # JS integration: полный цикл proto v1/v2
│   ├── test_gateway_extended.js  # JS: расширенные сценарии
│   ├── run_gateway_tests.sh # runner для gateway тестов
│   ├── run_gateway_test.sh  # runner для JS тестов
│   ├── package.json         # зависимости Node.js (ws)
│   └── manual-gateway-test/ # ручной тест через браузер
│
├── bench/           # Бенчмарки (информационные, без pass/fail)
│   └── bench_performance.c
├── static/          # Статический анализ
│   └── run_static.sh
├── sanitize/        # Запуск с ASan/UBSan/Valgrind
│   └── run_sanitizers.sh
├── tinytrack.conf-test  # Единый конфиг для всех тестов (debug-режим, /tmp пути)
└── run_tests.sh     # Главный runner
```

---

## Быстрый старт

```bash
# 1. Собрать проект
./bootstrap.sh
./configure
make

# 2. Запустить быстрые тесты (static + tinytd + cli)
sh tests/run_tests.sh

# 3. Запустить все тесты включая gateway
sh tests/run_tests.sh all
```

---

## Зависимости

### Обязательные

| Инструмент | Версия | Назначение |
|------------|--------|------------|
| gcc        | ≥ 9    | сборка C-тестов |
| make       | любая  | сборка проекта |
| autoconf / automake | любая | генерация Makefile |
| openssl    | любая  | TLS-тесты, генерация сертификатов |
| python3    | ≥ 3.9  | pytest-тесты gateway |
| pytest     | ≥ 7.0  | runner для Python-тестов |
| node       | ≥ 18   | JS integration тесты |
| npm        | ≥ 9    | установка зависимостей JS |

### Опциональные

| Инструмент | Назначение |
|------------|------------|
| cppcheck   | статический анализ C |
| valgrind   | проверка утечек памяти |

### Установка зависимостей

**openSUSE Tumbleweed:**
```bash
sudo zypper install gcc make autoconf automake openssl \
    python3 python3-pytest nodejs npm cppcheck valgrind
```

**Ubuntu / Debian:**
```bash
sudo apt install gcc make autoconf automake openssl \
    python3 python3-pytest nodejs npm cppcheck valgrind
```

**Fedora / RHEL:**
```bash
sudo dnf install gcc make autoconf automake openssl \
    python3 python3-pytest nodejs npm cppcheck valgrind
```

---

## Автоматическая настройка окружения

Скрипт `scripts/setup-test-env.sh` устанавливает все зависимости и собирает проект:

```bash
sh scripts/setup-test-env.sh
```

Что делает скрипт:
1. Определяет дистрибутив и устанавливает пакеты
2. Устанавливает Python-зависимости (`pip install pytest websockets`)
3. Устанавливает Node.js-зависимости (`npm install` в `tests/gateway/`)
4. Запускает `./bootstrap.sh && ./configure && make`
5. Проверяет что все бинарники собраны

---

## Запуск отдельных наборов тестов

### tinytd (unit + integration + system)

```bash
sh tests/run_tests.sh tinytd
```

Не требует запущенного демона. Тесты сами создают временные файлы в `/tmp/`.

### tiny-cli

```bash
sh tests/run_tests.sh cli
```

C-тесты не требуют демона. Shell-тест `test_cli_binary.sh` автоматически пропускает daemon-зависимые проверки если tinytd не запущен.

### gateway (tinytrack)

```bash
sh tests/run_tests.sh gateway
```

**Требует:** собранные бинарники `tinytd/tinytd` и `gateway/tinytrack`.

pytest-фикстуры в `conftest.py` автоматически:
- Запускают `tinytd` с конфигом `tests/tinytrack.conf-test`
- Запускают `tinytrack` на порту `14028` (plain WS) и `14443` (TLS)
- Останавливают оба процесса после тестов

Запуск отдельных suite:
```bash
# Только WebSocket тесты
python3 -m pytest tests/gateway/test_ws.py -v

# Только HTTP тесты
python3 -m pytest tests/gateway/test_http.py -v

# TLS тесты (требует openssl)
python3 -m pytest tests/gateway/test_tls.py -v

# Нагрузочные тесты
python3 -m pytest tests/gateway/test_load.py -v

# JS тесты
sh tests/gateway/run_gateway_test.sh
```

### Статический анализ

```bash
sh tests/run_tests.sh static
```

Запускает:
- `cppcheck` (если установлен)
- Компиляцию с `-Wall -Wextra -Werror`

### Бенчмарки

```bash
sh tests/run_tests.sh bench
```

Информационные, не влияют на pass/fail.

### Sanitizers (ASan + UBSan + Valgrind)

```bash
sh tests/run_tests.sh sanitize
```

---

## Конфигурация тестов

Все тесты используют единый конфиг `tests/tinytrack.conf-test`. Он содержит
секции для всех компонентов (tinytd, gateway) с путями в `/tmp/` и
debug-настройками:

```ini
[tinytd]
log_level = debug
pid_file  = /tmp/tinytd-test.pid

[storage]
live_path   = /tmp/tinytd-test-live.dat
shadow_path = /tmp/tinytd-test-shadow.dat

[collection]
interval_ms = 500

[ringbuffer]
l1_capacity = 20
...

[gateway]
listen          = ws://0.0.0.0:14028
update_interval = 500
```

Порты gateway для тестов:
- `14028` — plain WebSocket (ws://)
- `14443` — TLS WebSocket (wss://)

---

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `TINYTRACK_TEST_PORT` | порт gateway для pytest-тестов | `14028` |
| `TINYTRACK_CONF` | путь к конфигу | `/etc/tinytrack/tinytrack.conf` |

---

## Устранение проблем

### `tinytd did not create live file`
Демон не запустился. Проверьте:
```bash
./tinytd/tinytd -c tests/tinytrack.conf-test
# Смотрите вывод на ошибки
```

### `tinytrack did not start`
Gateway не запустился. Убедитесь что порт 14028 свободен:
```bash
ss -tlnp | grep 14028
```

### `Failed to write pid file: /var/run/tinytd.pid`
Это предупреждение, не ошибка. Тесты используют `/tmp/` пути, pid-файл в `/var/run/` не нужен.

### Python тесты не находят модуль `pytest`
```bash
pip install --user pytest
# или
python3 -m pip install pytest
```

### JS тесты: `Cannot find module 'ws'`
```bash
cd tests/gateway && npm install
```

### Очистка временных файлов после тестов
```bash
rm -f /tmp/tinytd-test-*.dat /tmp/tinytd-test.pid /tmp/tinytrack-test.pid
rm -f /tmp/tt-test-* /tmp/tt-bench-* /tmp/tt-san-*
```

---

## CI/CD интеграция

Пример `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          sudo apt-get install -y gcc make autoconf automake \
            openssl python3 python3-pip nodejs npm cppcheck
          pip install pytest

      - name: Build
        run: |
          ./bootstrap.sh
          ./configure
          make

      - name: Install JS deps
        run: cd tests/gateway && npm install

      - name: Run tests
        run: sh tests/run_tests.sh all
```

---

## Добавление новых тестов

### C unit-тест для tinytd
Создайте `tests/tinytd/test_myfeature.c` — он автоматически подхватится `run_tests.sh`.

### C unit-тест для CLI
Создайте `tests/cli/test_myfeature.c` — компилируется с `cli/src/*.c` и `common/*.c`.

### Python-тест для gateway
Создайте `tests/gateway/test_myfeature.py` с фикстурой `gateway` или `gateway_tls`.

### Shell-тест
Создайте `tests/tinytd/test_myfeature.sh` или `tests/cli/test_myfeature.sh` — подхватится автоматически.
