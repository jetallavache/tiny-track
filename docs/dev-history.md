# Dev History

---

==10 апреля 2026==

**tinytsdk Блок 9 (продолжение) — MetricsBar/Panel доработка, тема, demo**

**SDK — MetricsBar**

- Prop `sysInfo?: SysInfoType[]` — системные бейджи в строке метрик: `"uptime" | "hostname" | "os-type" | "ringbufInfo"`
- Тип `SysInfoType` экспортирован из `tinytsdk/react`
- Порядок метрик строго по массиву `metrics[]` — рефакторинг на `renderMetric(metric)` switch
- Бордер через `t.borderWidth` вместо хардкода `1px`

**SDK — MetricsPanel**

- Prop `columns?: 1 | 2` — двухколоночная раскладка; split по `Math.ceil(n/2)` (2/2, 3/2, 3/3, 4/3 и т.д.)
- Анимированный load avg: 8 block-символов `░▒▓█▓▒░░` с staggered CSS wave-анимацией; rising = красный ltr, falling = зелёный rtl
- Значения load avg `(1.23 / 0.98 / 0.75)` вынесены на отдельную строку в скобках — аналогично disk bytes
- `proc` — убран bar, значения `nrRunning / nrTotal` вплотную к лейблу
- `net` — убран лишний divider, rx/tx вплотную к лейблу
- Выравнивание: все строки используют `gap: 6` (L.avg row исправлен с `gap: 4`)
- Рефакторинг: `renderMetricRows(list)` с helper `mr()` — устранено дублирование

**SDK — MetricRow**

- Bar: заполненные `█` — цвет метрики; пустые `░` — `dimColor(color, t.bg, 0.62)` (приглушённый оттенок того же цвета)
- Value: `textShadow` через `t.glow` если задан в теме
- Prop `t?: TtTheme` добавлен для доступа к токенам

**SDK — theme.tsx**

- `TtTheme` расширен: `bgAlt`, `bgDeep`, `accent`, `accentMuted`, `borderWidth`, `shadowColor`, `shadowBlur`
- Все 6 пресетов обновлены с новыми токенами
- `invertColor(hex, light, dark)` — контрастный цвет по luminance (WCAG 2.1)
- `dimColor(hex, bg, amount=0.62)` — приглушённый оттенок через линейное смешение с фоном
- Обе утилиты экспортированы из `tinytsdk/react`

**Demo — LiveExample компонент**

- `LiveExample` в `components.tsx` — Preview/Code вкладки как в MUI/Radix docs
- Шапка с title + description; активная вкладка подчёркнута `t.accent`
- Props: `title?`, `description?`, `code`, `children`, `previewBg?`, `center?`

**Demo — страницы MetricsBar и MetricsPanel**

- `PageMetricsBar`: 6 примеров с кодом — размеры s/m/l, порядок метрик, все варианты sysInfo, только лампы, theme override
- `PageMetricsPanel`: 7 примеров — размеры, columns={2}, порядок метрик, load avg arrows, theme override

**Сервер — рефакторинг**

- `server/common/`, `server/gateway/`, `server/tinytd/`, `server/cli/` — форматирование и code cleanup
- `README.md`, `.gitignore` — мелкие правки

---

==8 апреля 2026 (рефакторинг)==

**SDK — реструктуризация, рефакторинг, исправление бандла**

**Новая структура `sdk/src/react/`**

```
react/
  TinyTrackProvider.tsx
  theme.tsx
  index.ts
  hooks/
    useAlertBadge.ts          ← выделен из MetricsBar/Panel/Dashboard
  utils/
    metrics.ts                ← MetricType, SizeType, AggregationType, SIZE_SCALE, extractMetricValue, aggregate
    format.ts                 ← fmtPct, fmtBytes, fmtLoad, fmtUptimeSec, formatMetricValue, bar
    alerts.ts                 ← Alert, LoadTrend, detectAlerts, loadTrend
  components/
    MetricsBar/
      index.tsx
      MetricItem.tsx          ← Sep + MetricItem sub-компоненты
    MetricsPanel/
      index.tsx
      MetricRow.tsx
    Dashboard/
      index.tsx
      MetricBarRow.tsx        ← MetricBarRow + SparkBlock
      WsConsole.tsx
    Timeline/
      index.tsx
      TimelineRow.tsx
    TimeSeriesChart/
      index.tsx               ← ChartPath внутри файла
    SystemLoad/
      index.tsx
    Metrics3D/
      index.tsx
    Sparkline/
      index.tsx
```

Старые файлы (`react/MetricsBar.tsx`, `react/MetricsPanel.tsx`, `react/dashboard/*.tsx`) остаются как есть — будут удалены в следующем коммите после проверки.

**Исправление бандла (1.3MB → 74KB)**

- `three` перенесён из `dependencies` в `peerDependencies` (optional)
- `three` добавлен в `external` в `rollup.config.js`
- `Metrics3D`: `import('three')` заменён на динамический `import('three').then(...)` — three.js загружается только при монтировании компонента, не попадает в бандл
- `react.esm.js`: 1.3MB → 74KB

**Комментарии**

- Все `//`-комментарии заменены на `/* */` или JSDoc-блоки `/** ... */`
- Добавлены JSDoc с `@param` / `@returns` на все публичные функции и компоненты
- Убраны избыточные секционные разделители `// ---`

**TypeScript-экспорты — полное покрытие**

`tinytsdk` (core):
- Добавлены ранее отсутствовавшие: `PROTO_MAGIC`, `HEADER_SIZE`, `PKT_ALERT`, `PKT_CMD`, `PKT_HISTORY_REQ`, `PKT_SUBSCRIBE`, `CMD_SET_ALERTS`, `ACK_OK`, `ACK_ERROR`
- Добавлены типы: `TtFrame`, `TtRingStat`

`tinytsdk/react`:
- Добавлены: `useRawPackets`, `Sparkline`, `SparklineProps`, `Alert`, `LoadTrend`
- Все prop-типы компонентов экспортированы

---

==8 апреля 2026==

**v0.3.0 — tinytsdk Блок 9: компоненты v2, SystemLoad, Metrics3D, raw packets**

**SDK — унифицированные props**

- `MetricType = 'cpu' | 'mem' | 'net' | 'disk' | 'load'` — общий тип для всех компонентов
- `AggregationType = 'avg' | 'max' | 'min'` — соответствует `tt_metrics_aggregate_avg/max/min` из `server/common/metrics.h`
- `SizeType = 's' | 'm' | 'l'` — три размера компонентов
- `SIZE_SCALE` — таблица масштабов: font, gap, pad, chartH для каждого размера
- `extractMetricValue`, `formatMetricValue`, `aggregate` — общие хелперы в `utils.ts`
- Prop `metrics?: MetricType[]` добавлен на: `MetricsBar`, `MetricsPanel`, `Dashboard`, `TimeSeriesChart`, `Timeline`
- Prop `size?: SizeType` добавлен на все компоненты
- Prop `aggregation?: AggregationType` добавлен на `TimeSeriesChart`, `Timeline`

**SDK — алерты (все компоненты)**

- Бейдж алерта в фиксированном месте (рядом с uptime/hostname) — `MetricsBar`, `MetricsPanel`, `Dashboard`
- Таймер 5 сек: `setTimeout` сбрасывает бейдж; новый алерт перекрывает старый через тот же `useState<Alert | null>`
- Макет компонента не сдвигается: слот бейджа имеет фиксированный `minWidth`

**SDK — Timeline v2**

- Фиксированное окно `VISIBLE_BARS = 200` баров — контейнер не расширяется
- Прокрутка колесом мыши (`onWheel`): `offset` сдвигает видимое окно по истории, без горизонтального overflow
- Кнопка `▶ live` — прыжок к последнему сэмплу (offset = 0)
- Несколько метрик на одной строке: бары разбиты по ширине, каждая метрика своим цветом
- Реальные timestamp из TSDB отображаются на оси

**SDK — TimeSeriesChart v2**

- `metrics[]` вместо `metric` — несколько линий на одном SVG
- `aggregation` prop — визуальная индикация в заголовке
- `size` prop — масштабирует высоту графика и шрифты

**SDK — новый компонент SystemLoad**

- `sdk/src/react/dashboard/SystemLoad.tsx`
- Анализирует `load1/5/15` + `nrRunning/nrTotal` → score 0–100
- Взвешенная формула: `l1*0.5 + l5*0.3 + l15*0.2`, нормализована к 200% нагрузки
- Уровни: idle / normal / elevated / high / critical
- Тренд: rising (l1 > l15 + 0.15) / falling / stable
- SVG полукруговой gauge с анимацией `stroke-dasharray`
- Цветовая градация через токены темы: ok → warn → crit
- Три размера (s/m/l)

**SDK — новый компонент Metrics3D**

- `sdk/src/react/dashboard/Metrics3D.tsx`
- three.js: 3D бар-чарт, ось Z = время, каждая метрика = колонка баров
- Автоматическое вращение камеры (sin/cos по времени)
- Высота баров = нормализованное значение метрики (0–1)
- Opacity баров пропорциональна значению
- `historyDepth` — количество временных шагов в сцене
- Три размера через `SIZE_SCALE.chartH`
- `npm install three @types/three` добавлен в `sdk/package.json`

**SDK — raw packets**

- `ClientEventMap.packet: [pktType: number, payload: DataView]` — новое событие в `client.ts`
- Диспатч `this._emit('packet', frame.type, frame.payload)` перед парсингом в `onmessage`
- `useRawPackets(handler)` хук в `TinyTrackProvider.tsx` — подписка на сырые пакеты без React-обёртки

**Экспорты**

- `sdk/src/react/index.ts`: добавлены `SystemLoad`, `Metrics3D`, `useRawPackets`; типы `MetricType`, `AggregationType`, `SizeType`
- Удалён устаревший `TimelineMetric` (заменён на `MetricType`)

**Demo-сайт**

- `PageMetricsBar`: обновлена под новые props (size, metrics)
- `PageTimeSeriesChart`: обновлена под `metrics[]`, `aggregation`, `size`; multi-metric preview
- `PageTimeline`: интерактивный выбор метрик и агрегации; обновлена под новый API
- `PageSystemLoad`: новая страница — preview трёх размеров, props table
- `PageMetrics3D`: новая страница — preview, usage, props table
- `Nav.tsx`, `App.tsx`: добавлены маршруты `SystemLoad`, `Metrics3D`

**Storybook**

- `MetricsBar.stories`: добавлены `Small`, `Large`, `CpuMemOnly`; `argTypes` для `size`, `metrics`
- `MetricsPanel.stories`: добавлены `Small`, `Large`, `CpuMemOnly`; `argTypes` для `size`, `metrics`
- `Timeline.stories`: переписаны под `metrics[]`, `aggregation`; добавлены `MultiMetric`, `MaxAgg`, `Large`
- `TimeSeriesChart.stories`: переписаны под `metrics[]`; добавлены `CpuMem`, `MaxAgg`, `Large`
- `SystemLoad.stories`: новый файл — `Default`, `Small`, `Large`, `HighLoad`, `Idle`
- `Metrics3D.stories`: новый файл — `Default`, `AllMetrics`, `Large`, `DeepHistory`

---

==8 апреля 2026 (планирование)==

**Roadmap — новые цели: tiny-cli TUI-архитектура, tinytsdk v2**

Сессия планирования. Код не менялся. Зафиксированы цели следующих блоков разработки.

**tiny-cli — TUI-архитектура (Блок 8)**

Определена архитектура TUI-программы на ncurses:
- MVC: Model (состояние метрик, история, алерты), View (отрисовка компонентов), Controller (обработка ввода, сигналов)
- Механика `touch` — пометить компонент для перерисовки (с учётом вложенности)
- Игровой цикл: `poll(fds)` → пересчёт состояния → `doupdate()`
- Собственная система событий: очередь `tt_event` (тип + payload), диспетчер
- Модули: инициализация ncurses, обработка `SIGWINCH`/`SIGTERM`, цветовые пары, компоненты-панели

**tinytsdk — Блок 9 (компоненты v2)**

Зафиксированы цели:
1. TypeScript-экспорт типов уже реализован (`declaration: true`); задача — проверить полноту и задокументировать
2. Raw-режим: `useRawPackets()` хук или `client.on('packet', ...)` — получать сырые `cmd`/`pkt` без React-обёртки
3. Prop `metrics` на всех компонентах — массив отображаемых метрик: `["cpu", "mem", "disk", "net", "load"]`
4. Prop `size` на всех компонентах — `"s" | "m" | "l"` (шрифты, отступы, размеры графиков)
5. Алерты: бейдж в фиксированном месте (рядом с uptime), таймер 5 сек, новый алерт перекрывает старый без сдвига макета
6. Адаптивность: улучшить responsive-поведение в demo и storybook
7. Новый компонент `SystemLoad` — лаконичная визуализация общей нагрузки (load + processes), цветовая градация, крупный шрифт, тренд ↑↓
8. `Timeline` v2: временны́е серии с реальными timestamp из TSDB, выбор интервала (select или ручной ввод), несколько метрик на одной линии, поведение при заполнении — прокрутка «колесом» без горизонтального overflow
9. Агрегации: применить `avg`/`max`/`min` (из `server/common/metrics.h`) в компонентах — выбор типа агрегации как prop или в UI
10. Новый компонент `Metrics3D` — three.js визуализация потока метрик в 3D

---

==5 апреля 2026==

**v0.2.0 — SDK themes, documentation site, CI/CD, install script**

**SDK — система тем**

- `sdk/src/react/theme.tsx`: интерфейс `TtTheme` (21 токен: bg, surface, border, divider, text, muted, faint, cpu/mem/net/disk/load, ok/warn/crit, btnBg/btnText, font, radius, glow, transition)
- 6 встроенных пресетов: `terminal` (TUI, monospace), `dark` (Catppuccin Mocha), `light` (Tailwind slate), `material` (Material Design 3), `dracula`, `heroui` (deep navy + violet, glow, transitions)
- `ThemeProvider`: `preset` + `theme` (точечный оверрайд поверх пресета)
- `useTheme()` хук; `themeStyles(t)` хелпер для inline-стилей
- `theme?: Partial<TtTheme>` prop добавлен на все 5 компонентов

**SDK — исправления протокола**

- `PKT_SYS_INFO` парсинг: `uptimeSec` читался как LE, сервер пишет `htobe64` (BE) — исправлено
- `PKT_SYS_INFO` парсинг: `slots*`/`interval*` читались как LE, сервер пишет `htonl` (BE) — исправлено
- `PKT_RING_STATS` парсинг: offsets 0/29/58 (неверно) → 0/25/50 (struct 25 байт, не 29)

**SDK — исправления React**

- `CMD_SET_INTERVAL`: убран `useEffect` с `prevIntervalIdx` ref — в React StrictMode ref сбрасывался при двойном mount, что перезаписывало интервал обратно на 1s. Команда теперь отправляется прямо в `onChange` select'а
- `CMD_START`/`CMD_STOP`: `setStreaming` переписан как `useCallback` со стабильной ссылкой; при reconnect `streaming` state сбрасывается в `true`
- Убран `<StrictMode>` из `demo/src/main.tsx` (маскировал оба бага выше)

**SDK — компоненты**

- `MetricsBar`: `compact` prop (auto-detect `window.innerWidth < 640`) — скрывает Load/Net/Proc на мобильных; фиксированные `minWidth` + `fontVariantNumeric: tabular-nums` на всех числовых полях
- `MetricsPanel`: uptime из `sysinfo.uptimeSec` (системный uptime хоста); фиксированные ширины полей
- `Dashboard`: кнопки ▶ Start / ⏸ Stop; WS-консоль логирует все → и ← пакеты (PKT_METRICS, PKT_ACK, PKT_CONFIG, PKT_SYS_INFO, PKT_RING_STATS); sysinfo (osType, slots) в footer; интервал 1s/2s/5s/10s/30s
- `Timeline`: новый компонент — L1/L2/L3 строки, горизонтальный скролл, hover-tooltip, auto-scroll к последнему, дедупликация по timestamp
- Все компоненты: `minWidth` на числовых полях, `tabular-nums`

**Storybook**

- `preview.tsx` (переименован из `.ts`): глобальный `ThemeProvider` + toolbar-переключатель 6 тем (кнопка 🎨)
- Все stories: `argTypes` controls (sliders, selects, toggles для mode/metric/height/rowHeight/compact/showDisk/showNet)
- Новые stories: `Compact` (MetricsBar), `TallRows` (Timeline), `AllMetrics` (TimeSeriesChart), `HighLoad` (все компоненты)

**Demo-сайт**

- Полностью переработан в документационный сайт:
  - `Introduction` — обзор, quick start, protocol flow
  - `Installation` — npm install, запуск сервера, Vite proxy, примеры
  - `Themes` — ThemeProvider API, live preview пресетов с color swatches, таблица токенов
  - Страница каждого компонента: live preview + code examples + props table
- `Nav.tsx`: sidebar (desktop, sticky) + hamburger drawer (mobile)
- `responsive.css`: media queries для sidebar/topbar переключения
- Переключатель тем в сайдбаре; `document.body.style` синхронизируется с активной темой
- `demo/` — реальное подключение к серверу, `VITE_WS_URL` env, Vite proxy на `:25015`
- `sdk/demo/` удалён (был создан случайно при запуске kiro-cli в sdk/)

**CI/CD**

- `.github/workflows/storybook.yml`: push в `main` (изменения в `sdk/`) → build → GitHub Pages
- `.github/workflows/server.yml`: push в `main` (изменения в `server/`) → C build → тесты → Docker Hub (`username/tinytrack:latest`)
- `.github/workflows/sdk-publish.yml`: тег `sdk/v*` → тесты → `npm publish tinytsdk`

**install.sh**

- One-line installer: `curl -fsSL .../install.sh | bash`
- Определяет OS (Debian/Ubuntu, Fedora/RHEL, Arch), устанавливает зависимости, собирает из исходников, включает systemd-сервисы
- `TINYTRACK_DOCKER=1` — Docker-режим (pull + создаёт `tinytrack-compose.yml`)
- Переменные: `TINYTRACK_VERSION`, `TINYTRACK_PREFIX`, `TINYTRACK_NO_SERVICE`

**Документация**

- `docs/en/install.md`, `docs/ru/install.md`: раздел "Быстрая установка" с curl-командой, таблицей переменных, примерами
- `README.md`: Quick Start обновлён — первая команда `curl | bash`
- `server/configure.ac`: версия `0.1.6` → `0.2.0`
- `sdk/package.json`: версия `0.1.8` → `0.2.0`
- Теги: `v0.2.0`, `sdk/v0.2.0`

---

==4 апреля 2026 (продолжение)==

**server v0.1.6 — Docker-first мониторинг хоста, ENV-конфиг, новый log backend**

**common/sysfs — новый модуль**

- `common/sysfs.h/c`: конфигурируемые пути к `/proc` и rootfs через env vars и config
- `tt_sysfs_init()` читает `TT_PROC_ROOT` / `TT_ROOTFS_PATH` из окружения
- `tt_sysfs_set_proc_root/set_rootfs_path()` — переопределение из конфига
- Pre-built пути: `stat`, `meminfo`, `net/dev`, `loadavg`, `uptime`, `hostname`, `ostype`, `osrelease`
- `BASE_MAX_LEN=128` для базовых путей — устраняет `-Werror=format-truncation`

**tinytd — proc_root/rootfs_path, убран du_path**

- `collector.c`: открывает `/proc`-файлы через `tt_sysfs_*()` вместо хардкода
- `collector.c`: `statvfs` вызывается на `tt_sysfs_rootfs("")` вместо `du_path`
- `config.h/c`: добавлены `proc_root`, `rootfs_path`; убран `du_path`
- `main.c`: вызывает `tt_sysfs_set_proc_root/set_rootfs_path` перед `tt_sysfs_init()`
- `writer.c`: передаёт `interval_ms` и agg-интервалы в `ttr_writer_config`

**ringbuf — интервалы в shm-заголовке**

- `ttr_header`: добавлены `interval_ms`, `l2_agg_interval_ms`, `l3_agg_interval_ms` (12 байт из padding)
- `ttr_writer_config`: те же поля; записываются при `ttr_writer_init` (только fresh init)
- Размер структуры не изменился (padding уменьшен с 216 до 204 байт)

**gateway — рефакторинг ttg_reader_get_sysinfo**

- `os_type` читается из `/proc/sys/kernel/ostype` + `osrelease` — данные хостового ядра при bind-mount
- Убран `gethostname()` fallback (возвращал hostname контейнера, не хоста)
- Убран `uname()` для `os_type` (namespace-специфичен, не отражает хост в Docker)
- `interval_ms`, `agg_l2_ms`, `agg_l3_ms` читаются из shm-заголовка вместо хардкода
- Добавлен `read_proc_line()` helper; подробное debug/warning логирование каждого поля

**log — docker backend**

- `TT_LOG_BACKEND_DOCKER`: пишет в stdout без timestamp (Docker добавляет его сам)
- Формат: `LEVEL  [ident] message` — аналогично postgres/redis
- `stdout` backend сохранён с timestamp для случаев когда он нужен явно
- Парсинг строки `"docker"` в `tt_config_parse_log_backend()`

**Docker — ENV-конфиг, volumes, TLS**

- `docker-entrypoint.sh`: генерирует конфиг из дефолтов, патчит значениями из ENV
- 16 ENV переменных: `TT_PROC_ROOT`, `TT_ROOTFS_PATH`, `TT_INTERVAL_MS`, `TT_DU_INTERVAL_SEC`, `TT_LIVE_PATH`, `TT_SHADOW_PATH`, `TT_L1/L2/L3_CAPACITY`, `TT_L2/L3_AGG_INTERVAL`, `TT_LISTEN`, `TT_UPDATE_INTERVAL`, `TT_LOG_LEVEL`, `TT_LOG_BACKEND`, `TT_TLS_CERT/KEY/CA`
- `VOLUME [/etc/tinytrack, /var/lib/tinytrack]` — конфиг монтируется пользователем
- TLS через ENV: `TT_LISTEN=wss://...` + `TT_TLS_CERT/KEY`
- `docker-compose.yml`: named volume для shadow, закомментированные примеры TLS и кастомного конфига
- Добавлен `libncurses6` в runtime-образ (исправлена ошибка `libncurses.so.6: not found`)
- Порт по умолчанию: `27017` (MongoDB) → `25015`
- `live_path` в docker-конфиге: `tinytd-docker-live.dat` — не конфликтует с хостовым демоном при shared `/dev/shm`

**Конфиги — унификация**

- `tinytrack.conf`: подробные комментарии, описание всех backend'ов включая `docker`, `proc_root`/`rootfs_path`
- `tinytrack.conf-docker`: `docker` log backend, отдельное имя live-файла
- `tinytrack.conf-debug`: без комментариев, исправлены ключи agg-интервалов
- `tinytrack.conf-test`: без комментариев, исправлен ключ `l2_agg_interval_sec` (был `l2_aggregate_interval`)

**Тесты**

- `test_sysinfo.py`: проверяет `hostname`, `os_type`, `uptime`, `interval_ms`, `agg_l2/l3_ms` на хосте и в Docker
- `test_docker_tls.py`: TLS-тесты против запущенного контейнера (без привязки к conftest)
- `suite_docker` в `run_gateway_tests.sh`: поднимает контейнер, прогоняет `test_ws + test_http + test_sock`
- `suite_docker_tls`: генерирует self-signed cert, запускает контейнер с `TT_LISTEN=wss://`, прогоняет TLS-тесты
- `suite_sysinfo`: sysinfo на хосте + в Docker
- `COMMON_SRCS`: добавлен `sysfs.c` во все runners и sanitizers
- `Makefile.am`: исправлены пути (`tinytd/` вместо `unit/`/`integration/`), убраны несуществующие `system/`

**Документация**

- `README.md`: ASCII-логотип, badges, mermaid-диаграмма архитектуры, оглавление docs/*
- `docs/OVERVIEW.md`: что/зачем, таблица метрик с источниками, кольцевой буфер
- `docs/ARCHITECTURE.md`: 4 mermaid-диаграммы (система, shm layout, протокол sequence, Docker bind-mount)
- `docs/CONFIGURATION.md`: mermaid-диаграмма приоритетов, все параметры с колонкой ENV, TLS
- `docs/DOCKER.md`: bind-mount схема, 3 варианта конфигурации, TLS, tiny-cli команды, таблица ограничений
- `docs/INSTALL.md`, `docs/BUILD.md`, `docs/HACKING.md`, `docs/TROUBLESHOOTING.md`: полная переработка
- Версия: `v0.1.6`

---

==4 апреля 2026==

**Реструктуризация проекта**

- Проект разделён на два независимых модуля: `server/` (C, Docker) и `sdk/` (TypeScript, npm)
- `server/`: перенесены `common/`, `tinytd/`, `cli/`, `gateway/`, `etc/`, `scripts/`, `tests/`, `docs/`, autotools-файлы, `bootstrap.sh`
- `server/tests/gateway/`: перенесены все интеграционные тесты gateway (Python, JS)
- `server/tests/gateway/manual-test-client/`: перенесён из `sdk/vanilla/`
- `server/Dockerfile`: добавлена заглушка multi-stage сборки
- `clean.sh` (корень): оркестратор очистки всех модулей; `server/scripts/clean.sh` — только C/autotools
- `docs/man/` → `server/etc/man/`; обновлены `Makefile.am` и `install-extras.sh`
- `.gitignore`: обновлены пути под новую структуру

**Протокол — Блок 1 (handshake и управление сессией)**

- `common/proto/v2.h`: добавлены `CMD_GET_SYS_INFO` (0x11), `CMD_START` (0x12), `CMD_STOP` (0x13), `PKT_SYS_INFO` (0x14)
- `PKT_SYS_INFO` payload (168 байт): hostname, os_type, uptime_sec, slots_l1/l2/l3, interval_ms, agg_l2_ms, agg_l3_ms
- Переименованы для единого стиля: `PKT_STATS` → `PKT_RING_STATS`, `CMD_GET_STATS` → `CMD_GET_RING_STATS`
- `gateway/src/net.h`: добавлен флаг `streaming_paused` в `ttg_conn`
- `gateway/src/reader.c`: `ttg_reader_get_sysinfo()` — hostname, uname, /proc/uptime, ёмкости буферов из shm
- `gateway/src/session.c`: обработка `CMD_GET_SYS_INFO`, `CMD_START`, `CMD_STOP`; таймер пропускает соединение при `streaming_paused`
- `server/tests/gateway/manual-test-client/`: обновлены proto.js/script.js/index.html — кнопки Get Sys Info, ▶ Start, ⏸ Stop, отображение PKT_SYS_INFO
- Версия: `v0.1.6`

**Исправление SIGSEGV в tinytd (collector.c)**

- Найдена корневая причина: `direct_statvfs()` вызывала `syscall(137, path, buf)` где buf — `struct statvfs` (112 байт), но syscall 137 на x86_64 — это `statfs`, пишущий `struct statfs` (120 байт); переполнение на 8 байт перезаписывало сохранённый регистр `rbx` на стеке `ttd_collect_disk`, обнуляя указатель `rt` в вызывающей функции
- `tinytd/src/collector.c`: `direct_statvfs()` заменена на стандартный `statvfs()` из libc
- `common/ringbuf/writer.c`: VLA `uint8_t tmp[n * cs]` в `ring_aggregate()` заменён на `malloc`; `madvise` обёрнут в `#ifdef MADV_RANDOM` для совместимости с `-std=c11`
- `common/config/paths.c`: `strdup` заменён на `malloc+strcpy` для совместимости с `-std=c11` без `_GNU_SOURCE`; добавлен `#include <unistd.h>`
- `tests/sanitize/run_sanitizers.sh`: добавлены `-D_POSIX_C_SOURCE=200809L -D_GNU_SOURCE`, `syslog.c`/`journal.c` в `COMMON_SRCS`; созданы `tests/unit/` и `tests/integration/` с симлинками на тесты из `tests/tinytd/`
- Все 12 sanitize-тестов (ASan+UBSan + Valgrind) проходят

**SDK — Блок 1 (proto.ts, client.ts, TinyTrackProvider)**

- `sdk/src/proto.ts`: добавлены `PKT_RING_STATS`, `PKT_SYS_INFO`, `CMD_GET_RING_STATS`, `CMD_GET_SYS_INFO`, `CMD_START`, `CMD_STOP`; интерфейс `TtSysInfo`; парсер `parseSysInfo()` (168 байт, TextDecoder для строк)
- `sdk/src/client.ts`: событие `sysinfo` в `ClientEventMap`; методы `getSysInfo()`, `start()`, `stop()`; диспатч `PKT_SYS_INFO` → emit `sysinfo`
- `sdk/src/react/TinyTrackProvider.tsx`: handshake в `onOpen` — `getSysInfo()` + `getSnapshot()`; `sysinfo` в контексте и `useMetrics()`; сброс `sysinfo` при дисконнекте
- `sdk/src/index.ts`: обновлены все экспорты
- Версия: `v0.1.8`

---

==1 апреля 2026 (продолжение 2)==

**SDK — TypeScript declarations**

- `sdk/tsconfig.json`: включены `declaration` + `declarationDir=dist` — генерация `.d.ts` файлов при сборке
- `sdk/package.json`: добавлен шаг `build:types` (`tsc --emitDeclarationOnly`), запускается перед rollup; исправлен путь типов React-экспорта на `dist/react/index.d.ts`
- Устранена ошибка `Could not find declaration file for module tinytsdk` при использовании пакета в TypeScript-проектах

**Инфраструктура**

- `.gitignore`: добавлены `sdk/dist/`, `sdk/*.tsbuildinfo`, `demo/dist/`, `demo/*.tsbuildinfo`
- `scripts/clean.sh`: добавлена очистка `sdk/node_modules`, `sdk/dist`, `demo/node_modules`, `demo/dist`

---

==1 апреля 2026 (продолжение)==

**SDK — tinytsdk (`sdk/`)**

- Создан npm-пакет `tinytsdk` с dual ESM/CJS exports и опциональными peer deps React
- `src/proto.ts` — полный парсер/билдер бинарного протокола v1+v2: все типы пакетов (PKT_METRICS, CONFIG, ACK, STATS, HISTORY_RESP), билдеры команд (`buildCmd`, `buildHistoryReq`, `buildSubscribe`)
- `src/client.ts` — `TinyTrackClient`: типизированные события, авто-реконнект, методы `getHistory`, `subscribe`, `setInterval`, `getSnapshot`, `getStats`
- `src/react/TinyTrackProvider.tsx` — React context + `useTinyTrack()` хук; пробрасывает `metrics`, `config`, `stats`, `connected`
- `src/react/dashboard/Dashboard.tsx` — информационная панель (compact/expanded):
  - CPU/Mem с ASCII-барами и процентами
  - Load avg: все три значения (1m / 5m / 15m)
  - Disk: процент + usage/total в KB/MB/GB
  - Net: ↑TX ↓RX в KB/MB/GB
  - Sparkline-графики в expanded-режиме
  - Алерты: CPU/Mem/Disk пороги, load trend (rising/falling), load spike
  - Выбор интервала обновления (1s/5s/10s/30s)
- `src/react/dashboard/TimeSeriesChart.tsx` — компонент time-series:
  - Подписка на ring level через `client.subscribe(level)`
  - Загрузка истории через `client.getHistory(level, N)`
  - SVG-график с area fill, latest value, timestamp
  - Поддержка метрик: cpu, mem, load, net, disk
- `src/react/dashboard/Sparkline.tsx` — SVG sparkline с area fill
- `src/react/dashboard/utils.ts` — форматирование, `detectAlerts()` с load trend, `loadTrend()`
- 28 тестов (vitest): proto parser + client lifecycle — все проходят

**Demo-приложение (`demo/`)**

- Vite + React + TypeScript
- Vite proxy: `/websocket` → `ws://localhost:4026`
- Показывает Dashboard (compact + expanded) и 5 TimeSeriesChart (cpu/mem/load/net на L1, disk на L2)

**Исправления**

- `daemonize()`: закрывает fd от SC_OPEN_MAX до 3 (не 0), переоткрывает fd 0-2 на `/dev/null` — исправлен баг когда принятый сокет получал fd=2 (stderr) и debug-логи попадали в клиентский сокет
- `tinytrack.conf-test`: добавлен `log_backend = stderr` для детерминированного поведения в тестах
- `run_gateway_tests.sh`: изолированные live/shadow пути для ASan и valgrind suite; `--no-daemon` для всех фоновых запусков; `fuser` для освобождения портов
- `run_gateway_test.sh`: убран `set -e`, добавлен `--no-daemon`
- `test_load.py`: исправлен парсинг HTTP статуса; увеличен timeout для coverage-сборок
- `configure.ac`: убраны `AC_TYPE_UINT{8,16,32,64}_T` — конфликтовали с `<stdint.h>` при `-Werror`
- `tests/Makefile.am`: suite-имена приведены в соответствие с `run_tests.sh`
- `valgrind-*` make-цели: `--no-daemon`, читают `live_path` из конфига, cleanup `/tmp`
- `run_static.sh`: scan-build проверяет HTML-отчёты вместо exit code

**Документация**

- `docs/man/tiny-cli.1`: добавлена команда `logs` с флагами `--lines`, `--level`, `--service tinytd|tinytrack`; `live` как алиас `metrics`; команда `script`; dashboard клавиши; короткие флаги `-p/-c/-P/-f/-i/-n/-v`; версия 0.1.4
- `docs/man/tinytd.8`, `tinytrack.8`: версия 0.1.4, дата обновлены; `[daemon]` → `[tinytd]`
- `etc/certs/README.md`: инструкции по генерации self-signed, SAN и CA сертификатов
- Версия: `v0.1.5`

---

==1 апреля 2026==

**Тесты**

- Введён единый конфигурационный файл для всех тестов: `tests/tinytrack.conf-test` (секции `[tinytd]`, `[collection]`, `[storage]`, `[ringbuffer]`, `[recovery]`, `[gateway]`)
- Удалён `tests/tinytd-test.conf`; все ссылки на него заменены во всех скриптах, Makefile.am и Python-фикстурах
- Унифицирован формат вывода shell-тестов: единый стиль `pass=N fail=N skip=N` во всех suite
- Исправлен `conftest.py` (`gateway_tls` fixture): `full-tls.conf` теперь патчится через regex вместо append дублирующей секции `[gateway]` — INI-парсер брал только первую секцию, TLS не применялся
- `gateway_tls` fixture изолирован: запускает собственный `tinytd` с отдельными путями `/tmp/tinytd-tls-live.dat` / `/tmp/tinytd-tls-shadow.dat`, не конкурирует с `gateway` fixture
- Исправлен детектор ASan/UBSan ошибок в `run_gateway_tests.sh`: паттерн `ERROR` ловил обычные gateway-логи; теперь ищем только `AddressSanitizer:` и `runtime error:` в ASan log-файлах

**CLI / Daemon**

- `tinytd`: переход с `getopt` на `getopt_long`; добавлены длинные флаги `--daemon`, `--no-daemon`, `--config`, `--help`; поведение по умолчанию изменено на `--daemon`
- `tinytrack`: добавлены `--no-daemon` (`-n`) и длинные версии всех флагов; поведение по умолчанию изменено на `--daemon`

**Сборка / Инфраструктура**

- Исправлены include-пути после реструктуризации `common/`: `common/log.h` → `common/log/log.h`, `common/log_internal.h` → `common/log/log_internal.h`; восстановлены umbrella-заголовки `common/config.h` и `common/ringbuf.h`
- `scripts/clean.sh` переписан: удаляет бинарники, `*.o`/`*.a`, autotools-файлы включая `config.h.in`, Python-кэш (`__pycache__`, `.pytest_cache`), `node_modules`, `/tmp/tt-*` и pid-файлы тестов
- `etc/certs/README.md`: инструкции по генерации self-signed, SAN и CA-подписанных сертификатов

**Документация**

- `README.md`: актуализированы команды запуска (длинные флаги), добавлены секции TESTING и CLEANING
- `docs/BUILD.md`: OpenSSL переведён в обязательные зависимости, добавлены тестовые инструменты
- `docs/INSTALL.md`: добавлен `tinytrack` user/group, оба systemd-сервиса, длинные флаги в примерах
- `docs/HACKING.md`: добавлены секции Testing и Cleaning с актуальными командами
- `docs/TESTING.md`: обновлено имя конфига, описание единого конфига, пути очистки
- `tests/README.md`: переписан, убраны устаревшие примеры сборки
- `tests/gateway/manual-gateway-test/README.md`: актуализированы команды запуска и endpoints
- Man-страницы `tinytd.8`, `tinytrack.8`: добавлены длинные флаги в SYNOPSIS и OPTIONS
- Версия: `v0.1.4`

---

==29 марта 2026==

- Исправлен доступ к `/dev/shm/tinytd-live.dat` для обычного пользователя: добавлен `usermod -aG tinytd` в `install-hook` с подсказкой `newgrp tinytd`
- Улучшена команда `tiny-cli logs`: добавлен флаг `--service tinytd|tinytrack`, исправлен баг с порядком вывода заголовка (`fflush`)
- Улучшен дашборд (Mode 2): буфер логов расширен до 64×256, добавлены скролл (`↑`/`↓`), фильтр по сервису (`f`), принудительное обновление (`r`)
- Исправлен `install-hook`: ACL теперь ставится на сами `.journal*` файлы, а не только на директорию
- Исправлен `uninstall-hook`: ACL чистится из `/var/log/journal`, удаляется пустая директория `/etc/tinytrack`
- Исправлен критический баг в `proto.js`: `tt_metrics` парсился как big-endian вместо little-endian — все значения (CPU, load, procs, timestamp) были некорректны
- Исправлен `fmtKB` → `fmtNet` с авто-единицами (B/s / KB/s / MB/s / GB/s)
- Версия: `v0.1.3`

> **partly**
>
> `tiny-cli logs` — вывод работает, но при отсутствии прав на journal выводит пустой блок без явной причины (нужно улучшить диагностику)

> **ready**
>
> - Права и группы после установки (`install-hook` / `uninstall-hook`) — полностью автоматизированы
> - Парсинг метрик в JS-клиенте — исправлен endianness, корректный вывод CPU / Load / Procs / ts / сеть
> - Dashboard Mode 2: скролл, фильтр, авто-размер строк по ширине терминала

> **next**
>
> - Проверить и дополнить man-страницы (`tiny-cli.1`) с новыми флагами `logs --service`
> - Рассмотреть добавление `--follow` режима в `tiny-cli logs` (аналог `journalctl -f`)
> - HTTP API `/api/metrics/live` возвращает сырые значения без масштабирования — привести к тому же формату что и WS
