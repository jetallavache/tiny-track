# TinyTrack Overview

TinyTrack — минималистичный демон сбора системных метрик для Linux с real-time стримингом через WebSocket. Не требует зависимостей в рантайме кроме libc и libssl.

## Why TinyTrack

> [!NOTE]
> TinyTrack разработан для ресурсоограниченных окружений: VDS с 1 GB RAM и 1 CPU. Потребление — менее 1% CPU и менее 10 MB RAM.

Типичные сценарии использования:

- Host or container monitoring without client-side agents
- Real-time dashboard in browser or terminal
- Three-tier metrics history
- Host system monitoring from a Docker container

## Components

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

## Metrics Collected

| Метрика | Источник | Описание |
|---------|----------|----------|
| CPU | `/proc/stat` | Total across all cores, % |
| Memory | `/proc/meminfo` | (total − available) / total, % |
| Network RX/TX | `/proc/net/dev` | All interfaces except lo, bytes/s |
| Disk | `statvfs(rootfs_path)` | Root filesystem usage, % |
| Load average | `/proc/loadavg` | 1 / 5 / 15 минут |

## Ring Buffer

```mermaid
flowchart LR
  L1("L1\n1 сек · 3600 записей\n~1 час"):::blue
  L2("L2\n1 мин · 1440 записей\n~24 часа"):::teal
  L3("L3\n1 час · 720 записей\n~30 дней"):::green

  L1 -->|aggregated every 60 с| L2
  L2 -->|aggregated every 3600 с| L3

  classDef blue  fill:#2980B9,stroke:#2980B9,color:#fff
  classDef teal  fill:#16A085,stroke:#16A085,color:#fff
  classDef green fill:#27AE60,stroke:#27AE60,color:#fff
```

Buffer lives in `/dev/shm` (tmpfs) — zero-copy mmap access. Periodically synced to a shadow file on disk for recovery after restart.

## Endpoints

| Протокол | Адрес | Описание |
|----------|-------|----------|
| WebSocket | `ws://host:25015/websocket` | Binary protocol v1/v2 |
| WebSocket TLS | `wss://host:25015/websocket` | Encrypted connection |
| HTTP | `GET http://host:25015/api/metrics/live` | JSON metrics snapshot |
