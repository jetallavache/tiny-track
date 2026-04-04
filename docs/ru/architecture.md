# Архитектура TinyTrack

## Общая схема

```mermaid
flowchart TB
  subgraph kernel["Linux Kernel"]
    proc["/proc/stat\n/proc/meminfo\n/proc/net/dev\n/proc/loadavg"]
    vfs["statvfs(rootfs)"]
  end

  subgraph tinytd["tinytd"]
    collector["Collector\nCPU · RAM · Net · Disk · Load"]
    runtime["epoll Runtime\ntimerfd"]
    writer["Ring Buffer Writer\nL1 write · L2/L3 aggregate"]
  end

  subgraph shm["/dev/shm"]
    live["tinytd-live.dat\nmmap · tmpfs"]
    shadow["tinytd-shadow.dat\nAdler-32 CRC"]
  end

  tinytrack["tinytrack\ngateway"]
  cli["tiny-cli"]
  clients["WebSocket Clients"]

  proc --> collector
  vfs --> collector
  collector --> runtime
  runtime -->|"tt_metrics"| writer
  writer -->|"seqlock write"| live
  writer -.->|"sync every 60s"| shadow
  shadow -.->|"recovery on start"| writer
  live -->|"mmap read"| tinytrack
  live -->|"mmap read"| cli
  tinytrack -->|"ws :25015"| clients
```

## Shared Memory Layout

```mermaid
block-beta
  columns 1
  header["ttr_header · 256 bytes\nmagic · version · writer_pid · interval_ms · agg_l2_ms · agg_l3_ms"]
  consumers["ttr_consumer_table · 2048 bytes\n32 consumer slots"]
  l1meta["L1 ttr_meta · 64 bytes\nseq · head · capacity · first_ts · last_ts"]
  l1data["L1 data · 3600 × ~64 bytes ≈ 225 KB"]
  l2meta["L2 ttr_meta · 64 bytes"]
  l2data["L2 data · 1440 × ~64 bytes ≈ 90 KB"]
  l3meta["L3 ttr_meta · 64 bytes"]
  l3data["L3 data · 720 × ~64 bytes ≈ 45 KB"]
```

Итого: ~360 KB при дефолтных настройках.

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

- `magic` = `0xAA`
- `checksum` = XOR всех байт заголовка кроме самого checksum

### Типы пакетов

```mermaid
flowchart LR
  subgraph server["Server → Client"]
    m("PKT_METRICS 0x01"):::blue
    c("PKT_CONFIG 0x02"):::blue
    a("PKT_ACK 0x05"):::blue
    h("PKT_HISTORY_RESP 0x11"):::blue
    s("PKT_RING_STATS 0x13"):::blue
    si("PKT_SYS_INFO 0x14"):::blue
  end
  subgraph client["Client → Server"]
    cmd("PKT_CMD 0x04"):::teal
    hr("PKT_HISTORY_REQ 0x10"):::teal
    sub("PKT_SUBSCRIBE 0x12"):::teal
  end

  classDef blue fill:#2980B9,stroke:#2980B9,color:#fff
  classDef teal fill:#16A085,stroke:#16A085,color:#fff
```

### Сессия

```mermaid
sequenceDiagram
  participant C as Client
  participant G as tinytrack

  C->>G: WebSocket Upgrade
  G->>C: PKT_CONFIG (interval_ms)
  G->>C: PKT_METRICS (каждые interval_ms)
  G->>C: PKT_METRICS
  C->>G: PKT_CMD (CMD_GET_SYS_INFO 0x11)
  G->>C: PKT_SYS_INFO (hostname, os, uptime, slots, intervals)
  C->>G: PKT_HISTORY_REQ (level=L2, max=100)
  G->>C: PKT_HISTORY_RESP (batch, last=1)
  C->>G: PKT_CMD (CMD_SET_INTERVAL, 500ms)
  G->>C: PKT_ACK (OK)
  G->>C: PKT_METRICS (каждые 500ms)
```

## Docker — мониторинг хоста

```mermaid
flowchart LR
  subgraph host["Host System"]
    hp["/proc"]:::gray
    hr["/"]:::gray
    hs["/dev/shm"]:::gray
  end

  subgraph container["Docker Container"]
    cp["/host/proc"]:::blue
    cr["/host/rootfs"]:::blue
    cs["/dev/shm"]:::blue
    td["tinytd\nTT_PROC_ROOT=/host/proc\nTT_ROOTFS_PATH=/host/rootfs"]:::teal
    gw["tinytrack\n:25015"]:::green
  end

  hp -->|"-v /proc:/host/proc:ro"| cp
  hr -->|"-v /:/host/rootfs:ro"| cr
  hs -->|"-v /dev/shm:/dev/shm"| cs
  cp --> td
  cr --> td
  td --> cs
  cs --> gw
  gw -->|ws| client["Client"]:::purple

  classDef gray   fill:#555,stroke:#555,color:#fff
  classDef blue   fill:#2980B9,stroke:#2980B9,color:#fff
  classDef teal   fill:#16A085,stroke:#16A085,color:#fff
  classDef green  fill:#27AE60,stroke:#27AE60,color:#fff
  classDef purple fill:#8E44AD,stroke:#8E44AD,color:#fff
```

> [!NOTE]
> `os_type` и `uptime` читаются из `/host/proc/sys/kernel/ostype` и `/host/proc/uptime` — отражают хостовую систему. `hostname` отражает UTS namespace контейнера — это ограничение ядра Linux.
