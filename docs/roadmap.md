# TinyTrack — Roadmap

> Рабочий файл. Не публикуется. Ведётся порциями: каждый блок — отдельная сессия разработки.
> Статусы: `[ ]` — не начато · `[~]` — в процессе · `[x]` — готово · `[?]` — под вопросом

---

## Блок 1 — Протокол: handshake и конфигурация

**Цель:** клиент и сервер обмениваются конфигурацией до начала стриминга метрик.

**Сервер (C):**
- [x] `CMD_GET_SYS_INFO` — вернуть клиенту: кол-во слотов в каждом буфере (L1/L2/L3), интервалы сбора и агрегации, системные данные (uptime, OS type, hostname)
- [x] `CMD_START` / `CMD_STOP` — управление стримингом метрик на уровне сессии
- [x] Однократный сбор системных данных: uptime, OS type, kernel version, hostname → `PKT_SYS_INFO`
- [x] Читать `interval_ms`, `agg_l2_ms`, `agg_l3_ms` из shm-заголовка (записываются tinytd при старте)
- [x] `CMD_SET_INTERVAL` — принять интервал от клиента; ответить `CMD_ACK OK` или `CMD_ACK ERR`
- [x] `os_type` и `uptime` из `/proc/sys/kernel/ostype|osrelease` и `/proc/uptime` — корректно в Docker
- [?] Пересмотреть поле `alert` в протоколе: нужно ли оно? Если да — определить семантику

**SDK (TypeScript):**
- [x] Константы в `proto.ts`: все `PKT_*`, `CMD_*`, `RING_L*`
- [x] Handshake в `TinyTrackProvider`: connect → `CMD_GET_SYS_INFO` → `CMD_GET_SNAPSHOT` → stream
- [x] Типы `TtSysInfo`, `TtMetrics`, `TtConfig`, `TtAck`, `TtStats`, `TtHistoryResp`
- [x] Исправлен парсинг `PKT_SYS_INFO`: `uptimeSec` читается как BE (`htobe64`), `slots*`/`interval*` как BE (`htonl`)
- [x] Исправлен парсинг `PKT_RING_STATS`: offsets 0/25/50 (было 0/29/58 — неверно)
- [x] `CMD_START`/`CMD_STOP` доступны через `client.start()` / `client.stop()`
- [x] `streaming` state + `setStreaming()` в контексте; `useCallback` для стабильности ссылки
- [x] Убран React StrictMode из demo (вызывал двойной mount → сброс интервала)
- [x] `CMD_SET_INTERVAL` отправляется прямо в `onChange`, не через `useEffect` (исключает race condition)

---

## Блок 2 — Буферы и TSDB

**Цель:** корректная работа кольцевых буферов, агрегация, временные метки.

**Сервер (C):**
- [ ] Проверить работу кольцевого буфера: корректность перезаписи, индексов, wrap-around
- [ ] Определить момент агрегации: по таймеру? по заполнению L1? явный триггер?
- [ ] Читать временные метки из TSDB: когда начался сбор, когда истекут данные на L1/L2/L3
- [ ] Рассмотреть 4-й буфер: стек критических событий (alerts) с длительным хранением
- [ ] Уточнить сроки хранения: L1 — 1 час, L2 — 1 день, L3 — 1 месяц (вместо 7 дней)

**SDK (TypeScript):**
- [x] После `CMD_GET_SYS_INFO` — конфигурация буферов (slots L1/L2/L3, интервалы) сохраняется в `sysinfo` state и отображается в Dashboard
- [x] `Timeline` — три строки L1/L2/L3, горизонтальный скролл, hover-tooltip, auto-scroll к последнему
- [x] `TimeSeriesChart` — SVG line chart, запрашивает историю при подключении, добавляет live-сэмплы
- [ ] `Timeline`: группировка по дням/часам, подгрузка данных по запросу (сейчас загружает всё сразу)
- [ ] `TimeSeriesChart`: уточнить поведение при смене `level` prop в runtime

---

## Блок 3 — Безопасность и устойчивость gateway

**Цель:** исключить segfault, UB, падения сервера от клиентских данных.

**Сервер (C) — защита от падений:**
- [ ] Ограничения размеров: URI ≤ 8KB, заголовки ≤ 16KB суммарно, WS-фрейм ≤ настраиваемый лимит
- [ ] Обработка частичных заголовков: буферизация до `\r\n\r\n`, таймаут на получение заголовков
- [ ] Таймауты на все этапы: ожидание заголовков, тела запроса, WS-фреймов, idle-соединение
- [ ] Корректная обработка `EPOLLHUP` / `EPOLLERR`: закрыть fd, освободить ресурсы, не читать
- [ ] Защита от slowloris: таймаут на неполные запросы, лимит одновременных соединений
- [ ] Лимит открытых fd: проверять перед `accept()`, отклонять при исчерпании

**Сервер (C) — валидация HTTP:**
- [ ] Проверка CRLF: отсутствие `\r\n\r\n` → ошибка
- [ ] Запрет null-байт и управляющих символов в заголовках
- [ ] Дублирующиеся заголовки: определить политику (первый / последний / ошибка)
- [ ] Валидация `Upgrade: websocket` + `Connection: Upgrade` + `Sec-WebSocket-Key`

**Сервер (C) — валидация WebSocket:**
- [ ] Проверка opcode: неизвестные → `1008 Policy Violation`, закрыть соединение
- [ ] Маскировка: клиент обязан маскировать фреймы (RFC 6455 §5.3)
- [ ] Длина payload: защита от integer overflow при чтении extended length (16/64 bit)
- [ ] Фрагментация: корректная сборка фрагментированных сообщений, лимит на общий размер
- [ ] Control-фреймы (ping/pong/close): не могут быть фрагментированы, payload ≤ 125 байт
- [ ] Close handshake: отправить close-фрейм в ответ, дождаться TCP FIN

**Авторизация:**
- [ ] Token-based аутентификация для WS-сессий
- [ ] Выдача токена при подключении, ротация по TTL
- [ ] Пересмотреть роль REST API: WS-only или расширить HTTP API (история, агрегаты)

**Инструменты проверки:**
- [ ] Прогнать под `valgrind --leak-check=full`
- [ ] Собрать с `-fsanitize=address,undefined` (ASan + UBSan), прогнать тесты
- [ ] Проверить все пути с `scan-build`

---

## Блок 4 — Тесты gateway

**Цель:** покрыть парсинг, WS-фреймы, безопасность юнит-тестами.

- [x] `CMD_SET_INTERVAL` — тест в `test_gateway_extended.js`: ACK получен, cmd_type совпадает
- [x] `CMD_SET_ALERTS` — тест в `test_gateway_extended.js`: ACK получен
- [x] `CMD_GET_SYS_INFO` — тест в `test_gateway_extended.js`: PKT_SYS_INFO получен, поля валидны
- [x] `CMD_START` / `CMD_STOP` — тест в `test_gateway_extended.js`
- [x] `PKT_HISTORY_REQ` — тест в `test_gateway_extended.js`: история возвращается батчами
- [x] `PKT_SUBSCRIBE` — тест в `test_gateway_extended.js`
- [x] `PKT_RING_STATS` — тест в `test_gateway_extended.js`
- [ ] HTTP-парсер: валидные запросы, отсутствие CRLF, null-байты, дублирующиеся заголовки, слишком длинный URI
- [ ] WS-фреймы: все opcodes, маскировка, extended length (126/127), фрагментация, control-фреймы
- [ ] WS close handshake: корректная последовательность закрытия
- [ ] Мусорные данные вместо HTTP-запроса: сервер не падает, возвращает 400
- [ ] Подмена заголовков: `Upgrade` без `Connection`, неверный `Sec-WebSocket-Version`
- [ ] Имитация обрыва соединения в середине фрейма
- [ ] Slowloris: соединение открыто, заголовки приходят по 1 байту

---

## Блок 5 — UI: демо-сайт и компоненты

**Цель:** документированная витрина всех компонентов SDK.

**Компоненты SDK:**
- [x] `MetricsBar` — compact status bar; `showDisk`, `showNet`, `compact` (mobile auto-detect), `theme` props
- [x] `MetricsPanel` — vertical panel; hostname + uptime из sysinfo, фиксированные ширины полей
- [x] `Dashboard` — compact/expanded mode; sparklines; Start/Stop; интервал; WS-консоль; sysinfo в footer
- [x] `TimeSeriesChart` — SVG line chart; history fetch on connect; live append; ring level selector
- [x] `Timeline` — L1/L2/L3 rows; horizontal scroll; hover tooltip; auto-scroll; deduplication

**Темы:**
- [x] `ThemeProvider` с `preset` + `theme` (точечный оверрайд токенов)
- [x] 6 пресетов: `terminal`, `dark`, `light`, `material`, `dracula`, `heroui`
- [x] `theme` prop на каждом компоненте (локальный оверрайд без Provider)
- [x] Токены: bg, surface, border, divider, text, muted, faint, cpu/mem/net/disk/load, ok/warn/crit, btnBg, font, radius, glow, transition

**Demo-сайт (`demo/`):**
- [x] Introduction — обзор SDK, список компонентов, quick start, protocol flow
- [x] Installation — npm install, запуск сервера, Vite proxy, примеры кода
- [x] Themes — ThemeProvider API, live preview пресетов с color swatches, таблица токенов
- [x] Страница каждого компонента: live preview + code examples + props table
- [x] Навигация: sidebar (desktop) + hamburger drawer (mobile)
- [x] Адаптивность: responsive grid, mobile top bar, `MetricsBar` compact на `< 640px`
- [x] Переключатель тем в сайдбаре; фон страницы синхронизируется с активной темой
- [x] `demo/` — реальное подключение к серверу (без mock), `VITE_WS_URL` env

**Storybook (`sdk/src/stories/`):**
- [x] Stories для всех 5 компонентов с `MockProvider` (без реального сервера)
- [x] `MockProvider` — анимированные фейковые метрики, история L1/L2/L3
- [x] Обновлены stories под новую систему тем: глобальный ThemeProvider + toolbar-переключатель
- [x] Добавлены `argTypes` controls: mode, metric, height, rowHeight, compact, showDisk, showNet
- [x] Новые stories: `Compact` (MetricsBar), `TallRows` (Timeline), `AllMetrics` (TimeSeriesChart), `HighLoad`

---

## Блок 6 — Vanilla JS и CDN

**Цель:** использование без React, подключение через `<script>`.

- [x] `TinyTrackClient` — TypeScript WebSocket клиент, работает без React
- [x] Все proto-функции экспортированы из `tinytsdk` (без `/react`)
- [ ] UMD/IIFE бандл для CDN (`<script src="tinytsdk.min.js">`)
- [ ] Vanilla JS компоненты (canvas/SVG без React)
- [ ] Готовые HTML-шаблоны: вставил тег → получил графики
- [ ] Примеры кода в документации

---

## Блок 7 — CI/CD и инфраструктура

- [x] Решить вопрос disk usage внутри контейнера (statvfs на bind-mounted rootfs)
- [x] Docker: ENV-конфиг (16 переменных), VOLUME для /etc/tinytrack, TLS через ENV
- [x] Docker: мониторинг хостовой системы через bind-mount /proc и /
- [x] Docker: отдельный log backend без timestamp (docker)
- [x] Docker: libncurses в runtime-образе, tiny-cli работает в контейнере
- [x] Документация: полная переработка с mermaid-диаграммами (OVERVIEW, ARCHITECTURE, CONFIGURATION, DOCKER, TROUBLESHOOTING)
- [x] GitHub Actions: Storybook build → deploy на GitHub Pages (`.github/workflows/storybook.yml`)
- [x] GitHub Actions: сборка C → тесты → Docker-образ → публикация на Docker Hub (`.github/workflows/server.yml`)
- [x] GitHub Actions: `tinytsdk` npm publish при теге `sdk/v*` (`.github/workflows/sdk-publish.yml`)
- [x] `install.sh` — one-line installer: `curl -fsSL .../install.sh | bash`; поддержка Debian/Ubuntu/RHEL/Arch + Docker-режим
- [ ] VirtualBox-окружение для end-to-end тестирования на чистой системе

---

## Блок 8 — tiny-cli: TUI-архитектура

**Цель:** переработать `tiny-cli dashboard` как полноценную TUI-программу с чистой архитектурой.

- [ ] MVC-разбивка: `Model` (метрики, история, алерты, состояние соединения), `View` (отрисовка панелей), `Controller` (ввод, сигналы, таймеры)
- [ ] Механика `touch`: пометить компонент/панель для перерисовки; учитывать вложенность (родитель dirty → дети dirty)
- [ ] Игровой цикл: `poll(fds, timeout)` → обновление модели → `doupdate()` (только помеченные окна)
- [ ] Собственная система событий: очередь `tt_event { type, payload }`, диспетчер, подписка компонентов
- [ ] Обработка сигналов: `SIGWINCH` → resize + full redraw; `SIGTERM`/`SIGINT` → graceful exit
- [ ] Цветовые пары: инициализация через таблицу, переключение тем (terminal / dark / light)
- [ ] Компоненты-панели: `StatusBar`, `MetricsPanel`, `TimelinePanel`, `LogPanel`, `HelpBar`
- [ ] Обработчики ввода: таблица `key → action`, modal-режим (например, ввод интервала)

---

## Блок 9 — tinytsdk v2: компоненты, адаптивность, новые визуализации

**Цель:** расширить SDK — raw-доступ к протоколу, унифицированные props, новые компоненты.

> Все изменения вносятся параллельно в `sdk/`, `demo/` и `sdk/src/stories/`.

**Протокол / клиент:**
- [x] Raw-режим: `useRawPackets()` хук — подписка на сырые входящие пакеты (`pktType`, `payload: DataView`) без React-обёртки
- [x] `ClientEventMap.packet` — новое событие, диспатч перед парсингом в `onmessage`
- [x] TypeScript-экспорты: полное покрытие — все константы, типы, парсеры, хуки экспортированы из `tinytsdk` и `tinytsdk/react`

**Унифицированные props для всех компонентов:**
- [x] `metrics?: MetricType[]` — массив отображаемых метрик: `"cpu" | "mem" | "net" | "disk" | "load"`; по умолчанию — все
- [x] `size?: "s" | "m" | "l"` — три размера: шрифты, отступы, высота графиков; по умолчанию `"m"`

**Алерты:**
- [x] Бейдж алерта в фиксированном месте (рядом с uptime) во всех компонентах: `MetricsBar`, `MetricsPanel`, `Dashboard`
- [x] Таймер 5 сек: бейдж исчезает автоматически; новый алерт перекрывает старый на том же месте без сдвига макета

**Адаптивность:**
- [x] Demo: `PreviewGrid` компонент для responsive grid; `responsive.css` расширен breakpoints; `main-content` без фиксированного `maxWidth`
- [x] Storybook: viewport addon настроен (mobile 375 / tablet 768 / desktop 1280); mobile stories добавлены в MetricsBar, Dashboard, Timeline, TimeSeriesChart

**Новые компоненты:**
- [x] `SystemLoad` — лаконичная визуализация общей нагрузки системы: анализ `load_1min/5min/15min` + `nr_running/nr_total`; цветовая градация (ok/warn/crit); крупный шрифт; индикатор тренда ↑↓ (растёт/снижается)
- [x] `Metrics3D` — three.js визуализация потока метрик: временна́я ось Z, метрики по осям X/Y, анимация новых сэмплов

**Metrics3D v2 — практичный инструмент администратора:**
- [ ] Высота куба = текущее значение метрики (высокий куб = высокая нагрузка); цветовая градация ok/warn/crit по токенам темы
- [ ] Hover-тултип на объекте: проценты, абсолютные значения, скорости трафика (net tx/rx), load average — всё в одном попапе
- [ ] Текстовая сводка в углу экрана: все метрики одним взглядом (текущее / max / min за сессию)
- [ ] Сессионные min/max: накапливаются с момента подключения, отображаются рядом с текущим значением
- [ ] Клик по объекту — открывает детальную панель с историей последних 60 значений (sparkline/line chart внутри 3D-оверлея)
- [ ] Кнопки переключения камеры: общий план / приближение к выбранной метрике / вид сверху (top-down)
- [ ] Чекбоксы для скрытия отдельных метрик (связаны с `metrics?: MetricType[]` prop)
- [ ] Кнопка паузы — заморозить текущий кадр (анимация и обновление данных останавливаются), чтобы рассмотреть детали

**Timeline v2:**
- [x] Реальные временны́е метки из TSDB (timestamp каждого слота); отображать ось времени
- [x] Выбор интервала: `<select>` с пресетами (60 / 120 / 200 / 300 / 500 баров) в заголовке компонента
- [x] Несколько метрик на одной временно́й линии (наложение)
- [x] Поведение при заполнении видимой области: прокрутка «колесом» (новые данные сдвигают старые влево), без горизонтального overflow и без расширения контейнера

**Агрегации:**
- [x] Prop `aggregation?: "avg" | "max" | "min"` на `TimeSeriesChart` и `Timeline` — соответствует функциям `tt_metrics_aggregate_avg/max/min` из `server/common/metrics.h`
- [x] Переключатель агрегации внутри компонентов: кнопки avg/max/min в заголовке `TimeSeriesChart` и `Timeline`; скрываются когда prop передан извне (controlled mode)

**MetricsBar — системная информация:**
- [x] Новый prop `sysInfo?: SysInfoType[]` — массив отображаемых системных полей: `"uptime" | "hostname" | "os-type" | "ringbufInfo"`; по умолчанию не отображается
- [x] Тип `SysInfoType` экспортируется из `tinytsdk`; данные берутся из `sysinfo` контекста (уже доступен после handshake)
- [x] Элементы `sysInfo` рендерятся в том же ряду что и метрики, порядок — слева направо по массиву

**MetricsPanel — колоночная раскладка:**
- [x] Новый prop `columns?: 1 | 2` (default `1`) — при `columns={2}`: title + cpu/mem/disk в первом столбце, load/net/footer — во втором; при `columns={1}` — текущее поведение (один столбец)
- [x] Порядок метрик в каждом столбце определяется массивом `metrics` prop (слева направо = сверху вниз внутри столбца)

**MetricsBar и MetricsPanel — порядок элементов:**
- [x] Порядок отображения `MetricItem` определяется порядком элементов в массиве `metrics?: MetricType[]`; компоненты рендерят элементы строго по индексу массива

**Тема — расширение токенов:**
- [x] Расширить объект темы: добавить `accent`, `accentMuted`, `bgAlt`, `bgDeep`, `borderWidth`, `shadowColor`, `shadowBlur`; обновить все 6 пресетов
- [x] Добавить утилиту `invertColor(hex): string` — контрастный цвет по luminance (WCAG 2.1); использовать для net tx/rx и стрелок load avg
- [x] Добавить утилиту `dimColor(hex, bg, amount): string` — приглушённый оттенок через смешение с фоном; использовать для пустых символов bar в MetricRow

**MetricsPanel — анимированный load avg:**
- [x] Для load avg — анимированный ASCII-ряд стрелок в стиле racing (как ограждения в NFS): `▶▶▶▶▶▶▶▶` мигают волной слева направо красным если нагрузка растёт, `◀◀◀◀◀◀◀◀` справа налево зелёным если падает
- [x] Ширина ряда = 8 стрелок; анимация через CSS keyframes (staggered delay на каждую стрелку); определение направления: сравнение `load_1min` vs `load_15min`
- [x] Стрелки: block-символы `░▒▓█▓▒░░` (те же что в bar); цвет берётся из `crit` / `ok` токенов темы; `dimColor` для приглушённых символов

**DiskMap — визуализация дискового пространства:**
- [ ] Новый компонент `DiskMap` — отображает использование диска с разбивкой по категориям
- [ ] Два режима отображения (переключаемые): **ring** (круговой бар, как donut chart) и **matrix** (поле квадратиков, например 30×80, каждый квадрат = единица пространства)
- [ ] Базовые данные: общий объём и занятое место из `tinytd` (disk usage из метрик)
- [ ] Внешние категории через prop `segments?: DiskSegment[]` — данные приходят от стороннего источника (например, RESTful API бэкенда): `{ label: string, bytes: number, color?: string }`; остаток (не покрытый сегментами) отображается как «other»
- [ ] Тип `DiskSegment` экспортируется из `tinytsdk`
- [ ] Цвета категорий: дефолтная палитра из токенов темы; переопределяется через `color` в сегменте
- [ ] Легенда: список категорий с цветом, меткой и процентом/объёмом
- [ ] Props: `segments?`, `mode?: "ring" | "matrix"`, `matrixCols?: number` (default 80), `matrixRows?: number` (default 30), `size?`, `theme?`
- [ ] Demo-страница и Storybook story с `MockProvider` + пример сегментов (db, uploads, other)

---

## Блок 10 — Документация: примеры кода и интеграции

**Примеры нестандартного использования:**
- [ ] Пример в docs: использование `useRawPackets()` для вывода метрик через запятую в plain text (репорт/лог-стиль), без React-компонентов — показывает что SDK не привязан к визуализации
- [ ] Пример: подписка на raw пакеты → запись в CSV / отправка в сторонний сервис

**Prometheus + Grafana — изучение и заимствование практик:**
- [ ] Изучить архитектурные различия: Prometheus — pull-модель (сервер сам скрейпит `/metrics`), TinyTrack — push/stream через WebSocket; зафиксировать trade-offs
- [ ] Изучить `node_exporter`: какие метрики собирает, как структурирует — сравнить с нашим набором (cpu/mem/net/disk/load)
- [ ] Изучить формат `/metrics` (OpenMetrics/Prometheus text format): `metric_name{label="value"} value timestamp`
- [ ] Изучить типы метрик Prometheus: **counter** (монотонно растёт), **gauge** (текущее значение), **histogram** (распределение), **summary** (квантили) — определить какие типы у наших метрик
- [ ] Изучить лейблы и временны́е ряды: как лейблы создают отдельные ряды (`cpu{core="0"}` vs `cpu{core="1"}`) — применимо ли к нашим L1/L2/L3 буферам
- [ ] Изучить функции `rate()` / `irate()` над range-векторами — аналог нашей агрегации avg/max/min; рассмотреть добавление `rate` как типа агрегации в `TimeSeriesChart`
- [ ] Изучить селекторы, matchers, instant/range векторы — применить концепцию к нашему `PKT_HISTORY_REQ` (фильтрация по уровню, метрике, временно́му диапазону)
- [ ] Изучить TSDB Prometheus: блоки, WAL, compaction — сравнить с нашими кольцевыми буферами L1/L2/L3; зафиксировать что можно позаимствовать
- [ ] По итогам: добавить эндпоинт `/metrics` в gateway (Prometheus-совместимый текстовый формат) — позволит подключить Grafana к TinyTrack без агента
- [ ] Зафиксировать в docs: «мы понимаем что Prometheus+Grafana — мощные инструменты; TinyTrack — lightweight альтернатива для embedded/edge; заимствуем лучшие практики»

---

## Блок 11 — Дистрибуция: CDN, npm badge, Linux пакеты

**npm badge на GitHub:**
- [ ] Добавить в workflow `sdk-publish.yml` шаг: после успешной публикации — обновить `README.md` badge с актуальной версией (или использовать динамический badge `https://img.shields.io/npm/v/tinytsdk`)
- [ ] Добавить в `README.md` и demo-сайт ссылку на npm-страницу пакета с версией

**CDN для Vanilla JS:**
- [ ] Изучить варианты CDN-хостинга для UMD/IIFE бандла: **jsDelivr** (`cdn.jsdelivr.net/npm/tinytsdk`) и **unpkg** (`unpkg.com/tinytsdk`) — работают автоматически после публикации на npm, ничего дополнительно делать не нужно
- [ ] Собрать UMD/IIFE бандл (`tinytsdk.min.js`) через rollup — добавить в `rollup.config.js` отдельный output format `iife`
- [ ] Добавить в docs пример подключения через `<script src="https://cdn.jsdelivr.net/npm/tinytsdk/dist/tinytsdk.min.js">`

**Linux пакеты (apt/rpm):**
- [ ] Изучить создание `.deb` пакета: `dpkg-buildpackage` или `fpm` (Effing Package Management) — упаковать `tinytrack` сервер + `tiny-cli`
- [ ] Изучить создание `.rpm` пакета через `fpm` или `rpmbuild`
- [ ] Рассмотреть публикацию в **Packagecloud.io** или **Gemfury** — хостинг приватных/публичных apt и rpm репозиториев (бесплатный tier есть)
- [ ] Рассмотреть **GitHub Releases** как apt-репозиторий через `aptly` или `reprepro` — хостинг на GitHub Pages
- [ ] Добавить в CI (`server.yml`): сборка `.deb` и `.rpm` артефактов при теге `server/v*`, прикрепить к GitHub Release
- [ ] `[?]` PPA на Launchpad (Ubuntu) — требует GPG и аккаунт Ubuntu; рассмотреть позже

---

## Отложено / под вопросом

- `[?]` `tiny-cli logs` без прав на journal: улучшить диагностику (сейчас пустой блок)
- `[?]` `--follow` режим в `tiny-cli logs` (аналог `journalctl -f`)
- `[?]` HTTP API `/api/metrics/live`: привести к тому же формату что и WS, или убрать
- `[?]` Пул процессов/потоков для изоляции клиентов (vs. неблокирующая модель — trade-off)
- `[?]` `PKT_ALERT` — поле `alert` в протоколе: определить семантику или убрать
- `[?]` `CMD_SET_ALERTS` — управление порогами алертов с клиента: нужно ли?
- `[?]` Storybook vs demo: рассмотреть объединение (Storybook как единственный docs-сайт)
