# Архитектура TinyTrack

## Общая схема

```mermaid
graph TB
    subgraph kernel["Linux Kernel"]
        proc["/proc/stat\n/proc/meminfo\n/proc/net/dev\n/proc/loadavg"]
        vfs["statvfs(rootfs)"]
    end

    subgraph tinytd["tinytd — collector daemon"]
        collector["Collector\nCPU · RAM · Net · Disk · Load"]
        runtime["epoll Runtime\n(timerfd)"]
        writer["Ring Buffer Writer\nL1 write · L2/L3 aggregate"]
    end

    subgraph shm["Shared Memory /dev/shm"]
        live["tinytd-live.dat\nmmap (tmpfs)"]
        shadow["tinytd-shadow.dat\n(persistent, Adler32 CRC)"]
    end

    subgraph readers["Readers"]
        tinytrack["tinytrack\ngateway"]
        cli["tiny-cli\nncurses dashboard"]
    end

    clients["WebSocket Clients\nbrowser · app · script"]

    proc --> collector
    vfs --> collector
    collector --> runtime
    runtime -->|"tt_metrics every interval_ms"| writer
    writer -->|"mmap write (seqlock)"| live
    writer -.->|"shadow sync every 60s"| shadow
    shadow -.->|"recovery on start"| writer

    live -->|"mmap read"| tinytrack
    live -->|"mmap read"| cli
    tinytrack -->|"WebSocket :25015\nbinary proto v1/v2"| clients
```

## Компоненты

### tinytd

Демон сбора метрик. Работает как системный сервис (systemd) или в foreground (`--no-daemon`).

**Жизненный цикл:**
1. Читает конфиг → инициализирует sysfs пути
2. Создаёт/восстанавливает live-файл в `/dev/shm`
3. Сбрасывает привилегии до `tinytd:tinytd`
4. Запускает epoll-цикл с `timerfd` на `interval_ms`
5. Каждый тик: читает `/proc/*` → пишет `tt_metrics` в L1 → агрегирует в L2/L3

### tinytrack

WebSocket/HTTP gateway. Читает live-файл через mmap и стримит метрики клиентам.

**Особенности:**
- Один epoll на все соединения (edge-triggered)
- Поддержка TLS через OpenSSL
- HTTP endpoint `/api/metrics/live` для REST-клиентов
- Бинарный протокол v1/v2 (см. [протокол](#протокол))

### tiny-cli

CLI-клиент. Читает live-файл напрямую через mmap (без сети).

```
tiny-cli status      — статус демона и буфера
tiny-cli metrics     — live метрики (обновление каждую секунду)
tiny-cli history l1  — история L1 (последний час)
tiny-cli dashboard   — интерактивный ncurses дашборд
```

## Shared Memory Layout

```mermaid
block-beta
    columns 1
    header["ttr_header (256 bytes)\nmagic · version · writer_pid · interval_ms · agg intervals"]
    consumers["ttr_consumer_table (2048 bytes)\n32 consumer slots"]
    l1meta["L1 ttr_meta (64 bytes)\nseq · head · capacity · first_ts · last_ts"]
    l1data["L1 data\n3600 × tt_metrics (~64 bytes each) ≈ 225 KB"]
    l2meta["L2 ttr_meta (64 bytes)"]
    l2data["L2 data\n1440 × tt_metrics ≈ 90 KB"]
    l3meta["L3 ttr_meta (64 bytes)"]
    l3data["L3 data\n720 × tt_metrics ≈ 45 KB"]
```

Итого: ~360 KB на дефолтных настройках.

**Seqlock** защищает каждый уровень от гонок между writer и readers без мьютексов.

## Протокол

Бинарный протокол поверх WebSocket. Каждый фрейм начинается с 10-байтового заголовка:

```
+--------+--------+--------+-----------+-----------+----------+
| magic  | ver    | type   | length    | timestamp | checksum |
| 1 byte | 1 byte | 1 byte | 2 bytes   | 4 bytes   | 1 byte   |
+--------+--------+--------+-----------+-----------+----------+
|                    payload (0..N bytes)                      |
+--------------------------------------------------------------+
```

### Типы пакетов

| Тип | Код | Направление | Описание |
|-----|-----|-------------|----------|
| `PKT_METRICS` | `0x01` | server→client | Снимок метрик |
| `PKT_CONFIG` | `0x02` | server→client | Конфигурация демона |
| `PKT_CMD` | `0x04` | client→server | Команда |
| `PKT_ACK` | `0x05` | server→client | Подтверждение команды |
| `PKT_HISTORY_REQ` | `0x10` | client→server | Запрос истории |
| `PKT_HISTORY_RESP` | `0x11` | server→client | Ответ с историей |
| `PKT_SUBSCRIBE` | `0x12` | client→server | Подписка на уровень |
| `PKT_RING_STATS` | `0x13` | server→client | Статистика буфера |
| `PKT_SYS_INFO` | `0x14` | server→client | Системная информация |

### Сессия

```mermaid
sequenceDiagram
    participant C as Client
    participant G as tinytrack

    C->>G: WebSocket Upgrade
    G->>C: PKT_CONFIG (interval_ms, alerts)
    G->>C: PKT_METRICS (every interval_ms)
    G->>C: PKT_METRICS
    C->>G: PKT_CMD (CMD_GET_SYS_INFO)
    G->>C: PKT_SYS_INFO (hostname, os, uptime, slots)
    C->>G: PKT_HISTORY_REQ (level=L2, max=100)
    G->>C: PKT_HISTORY_RESP (batch 1)
    G->>C: PKT_HISTORY_RESP (batch 2, last=1)
    C->>G: PKT_CMD (CMD_SET_INTERVAL, 500ms)
    G->>C: PKT_ACK (OK)
    G->>C: PKT_METRICS (every 500ms)
```

## Docker — мониторинг хоста

```mermaid
graph LR
    subgraph host["Host System"]
        hproc["/proc"]
        hrootfs["/"]
        hshm["/dev/shm"]
    end

    subgraph container["Docker Container"]
        hproc -->|"-v /proc:/host/proc:ro"| cproc["/host/proc"]
        hrootfs -->|"-v /:/host/rootfs:ro"| crootfs["/host/rootfs"]
        hshm -->|"-v /dev/shm:/dev/shm"| cshm["/dev/shm"]

        cproc --> tinytd2["tinytd\nTT_PROC_ROOT=/host/proc"]
        crootfs --> tinytd2
        tinytd2 --> cshm
        cshm --> tinytrack2["tinytrack\n:25015"]
    end

    tinytrack2 -->|"ws://host:25015"| client["Client"]
```

`tinytd` читает метрики хоста через bind-mounted `/proc`. `os_type` и `uptime` берутся из `/host/proc/sys/kernel/ostype` и `/host/proc/uptime` — отражают хостовую систему.

> **Примечание:** `hostname` в Docker отражает UTS namespace контейнера, а не хоста — это ограничение ядра Linux.
