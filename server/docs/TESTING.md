# TinyTrack — Руководство по тестированию

## Структура тестов

```
tests/
├── tinytd/                      # Тесты tinytd и common-библиотек
│   ├── test_config.c            # unit: парсер INI-конфига
│   ├── test_metrics.c           # unit: агрегация метрик
│   ├── test_ringbuf.c           # unit: кольцевой буфер (writer/reader)
│   ├── test_shm.c               # unit: shared memory
│   ├── test_seqlock.c           # integration: seqlock под нагрузкой
│   ├── test_shadow_sync.c       # integration: синхронизация shadow-файла
│   ├── test_shm_ipc.c           # integration: IPC через shared memory
│   ├── test_smoke.sh            # system: запуск/остановка демона
│   ├── test_signals.sh          # system: обработка сигналов
│   └── test_perf.sh             # system: производительность
│
├── cli/                         # Тесты tiny-cli
│   ├── test_cli_output.c        # unit: форматирование вывода
│   ├── test_cli_config.c        # unit: загрузка конфига CLI
│   └── test_cli_binary.sh       # integration: тест бинарника
│
├── gateway/                     # Тесты tinytrack (gateway)
│   ├── conftest.py              # pytest fixtures: запуск tinytd + tinytrack
│   ├── test_ws.py               # WebSocket протокол
│   ├── test_http.py             # HTTP API
│   ├── test_tls.py              # TLS
│   ├── test_sock.py             # socket/epoll
│   ├── test_load.py             # нагрузочные тесты
│   ├── test_sysinfo.py          # sysinfo: хост и Docker
│   ├── test_gateway.js          # JS integration
│   ├── test_gateway_extended.js # JS расширенные сценарии
│   ├── run_gateway_tests.sh     # runner (суиты: ws http tls load sock js sysinfo docker sanitize valgrind all)
│   ├── run_gateway_test.sh      # runner для JS тестов
│   ├── package.json             # зависимости Node.js
│   └── manual-test-client/      # ручной тест через браузер
│
├── bench/                       # Бенчмарки (информационные)
│   └── bench_performance.c
├── static/                      # Статический анализ
│   └── run_static.sh
├── sanitize/                    # ASan/UBSan/Valgrind
│   └── run_sanitizers.sh
├── tinytrack.conf-test          # Конфиг для всех тестов (/tmp пути, debug)
└── run_tests.sh                 # Главный runner
```

---

## Быстрый старт

```bash
# Собрать проект
./bootstrap.sh && ./configure && make

# Быстрые тесты (static + tinytd + cli)
sh tests/run_tests.sh

# Все тесты включая gateway
sh tests/run_tests.sh all

# Все тесты включая Docker
sh tests/run_tests.sh all docker
```

---

## Зависимости

| Инструмент | Назначение |
|------------|------------|
| gcc ≥ 9    | сборка C-тестов |
| python3 ≥ 3.9 + pytest | gateway тесты |
| openssl    | TLS-тесты |
| node ≥ 18 + npm | JS integration тесты |
| docker     | Docker integration тесты |
| cppcheck   | статический анализ (опционально) |
| valgrind   | проверка памяти (опционально) |

**Установка (Ubuntu/Debian):**
```bash
sudo apt install gcc make autoconf automake libssl-dev libncurses-dev \
    python3 python3-pytest nodejs npm cppcheck valgrind
```

**Установка (openSUSE):**
```bash
sudo zypper install gcc make autoconf automake libopenssl-devel ncurses-devel \
    python3 python3-pytest nodejs npm cppcheck valgrind
```

Автоматическая установка:
```bash
sh scripts/setup-test-env.sh
```

---

## Суиты тестов

### `run_tests.sh` — главный runner

```
Суиты:  static  tinytd  cli  gateway  docker  bench  sanitize  all
По умолчанию: static tinytd cli
```

| Суит | Что запускает |
|------|---------------|
| `static` | cppcheck + `-Wall -Wextra -Werror` |
| `tinytd` | C unit/integration + shell system тесты |
| `cli` | C unit + shell integration тесты |
| `gateway` | полный набор gateway тестов (ws/http/tls/load/sock/js/sysinfo/sanitize) |
| `docker` | gateway тесты внутри Docker-контейнера |
| `bench` | бенчмарки (информационные) |
| `sanitize` | ASan+UBSan+Valgrind для C-тестов |
| `all` | все суиты кроме docker |

### `run_gateway_tests.sh` — gateway runner

```
Суиты: ws http tls load sock js sysinfo docker sanitize valgrind all
По умолчанию: ws http tls load sock js
```

| Суит | Что запускает |
|------|---------------|
| `ws` | WebSocket протокол |
| `http` | HTTP API |
| `tls` | TLS (требует openssl) |
| `load` | нагрузочные тесты |
| `sock` | socket/epoll |
| `js` | JS integration (требует node) |
| `sysinfo` | sysinfo на хосте + в Docker |
| `docker` | полный цикл gateway тестов в контейнере |
| `sanitize` | gateway под ASan+UBSan |
| `valgrind` | gateway под valgrind |
| `all` | ws+http+tls+load+sock+js+sysinfo+sanitize+valgrind |

---

## Примеры запуска

```bash
# Только unit-тесты
sh tests/run_tests.sh tinytd cli

# Только gateway
sh tests/run_tests.sh gateway

# Docker integration
sh tests/run_tests.sh docker

# Отдельный pytest
python3 -m pytest tests/gateway/test_ws.py -v

# Sysinfo (хост + Docker)
sh tests/gateway/run_gateway_tests.sh sysinfo

# Полный цикл в Docker
sh tests/gateway/run_gateway_tests.sh docker
```

---

## Конфигурация тестов

Все тесты используют `tests/tinytrack.conf-test`:

```ini
[tinytd]
log_level = debug; log_backend = stderr
pid_file  = /tmp/tinytd-test.pid

[collection]
interval_ms = 500; du_interval_sec = 10
proc_root = /proc; rootfs_path = /

[storage]
live_path   = /tmp/tinytd-test-live.dat
shadow_path = /tmp/tinytd-test-shadow.dat

[ringbuffer]
l1_capacity=20; l2_capacity=10; l3_capacity=5
l2_agg_interval_sec=10; l3_agg_interval_sec=60

[gateway]
listen = ws://0.0.0.0:14029; update_interval = 500
```

Порты:
- `14028` — plain WS (pytest `gateway` fixture)
- `14029` — plain WS (конфиг по умолчанию)
- `14030` — Docker sysinfo тест
- `14032` — Docker gateway suite
- `14443` — TLS WS

---

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `TINYTRACK_TEST_PORT` | порт gateway для pytest | `14028` |
| `TINYTRACK_DOCKER_PORT` | порт Docker sysinfo теста | `14030` |
| `TT_PROC_ROOT` | путь к /proc (для Docker) | `/proc` |
| `TT_ROOTFS_PATH` | путь к rootfs (для Docker) | `/` |

---

## Docker тесты

Требуют собранный образ и доступ к Docker daemon:

```bash
# Добавить пользователя в группу docker (один раз)
sudo usermod -aG docker $USER
newgrp docker

# Запустить Docker тесты
sh tests/run_tests.sh docker
# или
sh tests/gateway/run_gateway_tests.sh docker
```

Контейнер монтирует хостовые `/proc` и `/` для мониторинга родительской системы:
```bash
docker run -v /proc:/host/proc:ro -v /:/host/rootfs:ro -v /dev/shm:/dev/shm \
    -p 25015:25015 tinytrack-test:latest
```

---

## Устранение проблем

**`tinytd did not create live file`** — демон не запустился:
```bash
./tinytd/tinytd --no-daemon -c tests/tinytrack.conf-test
```

**Порт занят:**
```bash
ss -tlnp | grep 14028
pkill -f tinytrack
```

**Зомби-процессы после тестов:**
```bash
pkill -f "tinytd|tinytrack"
rm -f /tmp/tinytd-test*.dat /tmp/tinytd-test.pid /tmp/tinytrack-test.pid
```

**Docker: `permission denied`:**
```bash
sudo usermod -aG docker $USER && newgrp docker
```

**JS тесты: `Cannot find module 'ws'`:**
```bash
cd tests/gateway && npm install
```

---

## CI/CD

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install deps
        run: |
          sudo apt-get install -y gcc make autoconf automake \
            libssl-dev libncurses-dev python3 python3-pip nodejs npm cppcheck
          pip install pytest
      - name: Build
        run: ./bootstrap.sh && ./configure && make
      - name: JS deps
        run: cd tests/gateway && npm install
      - name: Tests
        run: sh tests/run_tests.sh all
      - name: Docker tests
        run: sh tests/run_tests.sh docker
```
