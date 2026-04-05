# Обзор TinyTrack

TinyTrack — минималистичный демон сбора системных метрик для Linux с real-time стримингом через WebSocket. Не требует зависимостей в рантайме кроме libc и libssl.

## Зачем

> [!NOTE]
> TinyTrack разработан для ресурсоограниченных окружений: VDS с 1 GB RAM и 1 CPU. Потребление — менее 1% CPU и менее 10 MB RAM.

Типичные сценарии использования:

- Мониторинг хоста или контейнера без агентов на стороне клиента
- Real-time дашборд в браузере или терминале
- История метрик трёх уровней детализации
- Мониторинг хостовой системы из Docker-контейнера

## Компоненты

```mermaid
flowchart LR
  tinytd("tinytd\nколлектор"):::blue
  shm("shared memory\n/dev/shm"):::gray
  tinytrack("tinytrack\ngateway"):::teal
  cli("tiny-cli\nCLI"):::green
  clients("WebSocket\nклиенты"):::purple

  tinytd -->|mmap write| shm
  shm -->|mmap read| tinytrack
  shm -->|mmap read| cli
  tinytrack -->|ws :25015| clients

  classDef blue   fill:#2980B9,stroke:#2980B9,color:#fff
  classDef teal   fill:#16A085,stroke:#16A085,color:#fff
  classDef green  fill:#27AE60,stroke:#27AE60,color:#fff
  classDef gray   fill:#555,stroke:#555,color:#fff
  classDef purple fill:#8E44AD,stroke:#8E44AD,color:#fff
```

| Компонент | Бинарник | Назначение |
|-----------|----------|------------|
| **tinytd** | `tinytd` | Демон сбора метрик (CPU, RAM, сеть, диск) |
| **tinytrack** | `tinytrack` | WebSocket/HTTP gateway |
| **tiny-cli** | `tiny-cli` | CLI клиент с ncurses дашбордом |

## Что собирается

| Метрика | Источник | Описание |
|---------|----------|----------|
| CPU | `/proc/stat` | Суммарная загрузка всех ядер, % |
| Memory | `/proc/meminfo` | (total − available) / total, % |
| Network RX/TX | `/proc/net/dev` | Все интерфейсы кроме lo, байт/с |
| Disk | `statvfs(rootfs_path)` | Использование корневой ФС, % |
| Load average | `/proc/loadavg` | 1 / 5 / 15 минут |

## Кольцевой буфер

```mermaid
flowchart LR
  L1("L1\n1 сек · 3600 записей\n~1 час"):::blue
  L2("L2\n1 мин · 1440 записей\n~24 часа"):::teal
  L3("L3\n1 час · 720 записей\n~30 дней"):::green

  L1 -->|агрегация каждые 60 с| L2
  L2 -->|агрегация каждые 3600 с| L3

  classDef blue  fill:#2980B9,stroke:#2980B9,color:#fff
  classDef teal  fill:#16A085,stroke:#16A085,color:#fff
  classDef green fill:#27AE60,stroke:#27AE60,color:#fff
```

Буфер хранится в `/dev/shm` (tmpfs) — zero-copy доступ через mmap. Периодически синхронизируется в shadow-файл на диске для восстановления после перезапуска.

## Эндпоинты

| Протокол | Адрес | Описание |
|----------|-------|----------|
| WebSocket | `ws://host:25015/websocket` | Бинарный протокол v1/v2 |
| WebSocket TLS | `wss://host:25015/websocket` | Зашифрованное соединение |
| HTTP | `GET http://host:25015/api/metrics/live` | JSON-снимок метрик |
