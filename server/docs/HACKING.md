# Разработка TinyTrack

## Структура проекта

```
server/
├── common/              # Общие библиотеки
│   ├── ringbuf/         # Кольцевой буфер (writer, reader, shm, seqlock)
│   ├── log/             # Система логирования (stderr, syslog, journal)
│   ├── config/          # Парсер INI-конфига
│   ├── metrics.h/c      # Структура tt_metrics
│   ├── sysfs.h/c        # Конфигурируемые пути к /proc и /
│   ├── timer.h/c        # timerfd обёртка
│   └── proto/           # Бинарный протокол v1/v2
├── tinytd/src/          # Демон сбора метрик
├── gateway/src/         # WebSocket gateway
├── cli/src/             # CLI клиент
├── tests/               # Тесты
├── docs/                # Документация
├── etc/                 # Конфиги и systemd unit-файлы
├── docker-entrypoint.sh
├── docker-compose.yml
└── Dockerfile
```

## Autotools

```bash
# После изменения Makefile.am или configure.ac
autoreconf -fi
./configure && make
```

## Добавление нового файла

1. Добавить в `*/Makefile.am` в соответствующий `_SOURCES`
2. `autoreconf -fi && ./configure && make`

## Форматирование кода

```bash
make format          # применить clang-format
make format-check    # проверить без изменений
```

Конфигурация: `.clang-format` в корне.

## Тестирование

```bash
sh tests/run_tests.sh              # быстрые тесты
sh tests/run_tests.sh all          # все тесты
sh tests/run_tests.sh docker       # тесты в Docker
```

Подробнее: [TESTING.md](TESTING.md)

## Добавление нового теста

- **C unit-тест для tinytd:** `tests/tinytd/test_*.c` — подхватывается автоматически
- **C unit-тест для CLI:** `tests/cli/test_*.c`
- **Python-тест gateway:** `tests/gateway/test_*.py` с фикстурой `gateway`
- **Shell-тест:** `tests/tinytd/test_*.sh` или `tests/cli/test_*.sh`

## Протокол

Бинарный протокол описан в `common/proto/v1.h` и `common/proto/v2.h`.

При добавлении нового типа пакета:
1. Добавить константу `PKT_*` в `v2.h`
2. Добавить структуру payload
3. Обработать в `gateway/src/session.c`
4. Добавить тест в `tests/gateway/test_ws.py`

## Релиз

Версия задаётся в `configure.ac`:
```
AC_INIT([tinytrack], [0.1.5], ...)
```

Обновить также бейдж в `README.md`.
