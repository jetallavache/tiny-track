# TinyTrack SDK — tinytsdk

TypeScript SDK для TinyTrack с WebSocket-клиентом, React-компонентами и поддержкой vanilla JS.

## Установка

### npm (React + TypeScript)

```bash
npm install tinytsdk
```

### CDN (Vanilla JS, без сборки)

```html
<script src="https://cdn.jsdelivr.net/npm/tinytsdk/dist/tinytsdk.min.js"></script>
```

## Быстрый старт

### React / Next.js

```jsx
import { TinyTrackProvider, MetricsBar } from 'tinytsdk/react';

export default function App() {
  return (
    <TinyTrackProvider url="ws://your-host:25015">
      <MetricsBar />
    </TinyTrackProvider>
  );
}
```

### Vanilla JS (CDN)

```html
<script src="https://cdn.jsdelivr.net/npm/tinytsdk/dist/tinytsdk.min.js"></script>
<script>
  const client = new TinyTrack.TinyTrackClient('ws://your-host:25015');
  client.on('metrics', (m) => {
    console.log(`CPU: ${(m.cpu / 100).toFixed(1)}%  RAM: ${(m.mem / 100).toFixed(1)}%`);
  });
  client.connect();
</script>
```

### TypeScript (ESM)

```ts
import { TinyTrackClient } from 'tinytsdk';

const client = new TinyTrackClient('ws://your-host:25015');
client.on('metrics', (m) => {
  console.log(`CPU: ${m.cpu / 100}%  RAM: ${m.mem / 100}%`);
});
await client.connect();
```

## Справочник API

### TinyTrackClient

WebSocket-клиент для потоковой передачи метрик в реальном времени.

#### Конструктор

```ts
new TinyTrackClient(url: string, options?: TinyTrackClientOptions)
```

#### Методы

- `connect(): Promise<void>` — Подключиться к серверу
- `disconnect(): Promise<void>` — Отключиться корректно
- `getSnapshot(): void` — Запросить текущий снимок метрик
- `getStats(): void` — Запросить статистику кольцевых буферов
- `getSysInfo(): void` — Запросить информацию о системе
- `setInterval(ms: number): void` — Установить интервал сбора
- `start(): void` — Начать потоковую передачу
- `stop(): void` — Остановить потоковую передачу
- `getHistory(level: number, count?: number, startTs?: number, endTs?: number): void` — Запросить исторические данные
- `subscribe(level: number, count?: number): void` — Подписаться на обновления истории

#### События

- `connect` — TCP-соединение установлено
- `ready` / `open` — WebSocket handshake завершён, потоковая передача активна
- `metrics` — Получен новый снимок метрик
- `config` — Конфигурация изменена
- `stats` — Получена статистика кольцевых буферов
- `sysinfo` — Получена информация о системе
- `history` — Получены исторические данные
- `reconnecting` — Попытка переподключения
- `disconnect` — Соединение закрыто
- `error` — Произошла ошибка

#### Пример

```ts
const client = new TinyTrackClient('ws://localhost:25015');

client.on('ready', () => console.log('Подключено'));
client.on('metrics', (m) => {
  console.log(`CPU: ${m.cpu}%, MEM: ${m.mem}%, LOAD: ${m.load1}`);
});
client.on('error', (err) => console.error('Ошибка:', err));

await client.connect();
client.getSnapshot();
```

### React-компоненты

#### TinyTrackProvider

Предоставляет контекст метрик дочерним компонентам.

```jsx
<TinyTrackProvider 
  url="ws://your-host:25015"
  token="optional-auth-token"
>
  <YourApp />
</TinyTrackProvider>
```

#### MetricsBar

Компактная горизонтальная полоса с CPU, памятью, сетью, диском.

```jsx
<MetricsBar />
```

#### MetricsPanel

Детальная панель с текущими метриками и мини-графиками.

```jsx
<MetricsPanel />
```

#### Dashboard

Полнофункциональная панель управления со спидометрами, графиками и элементами управления.

```jsx
<Dashboard mode="expanded" />
```

#### TimeSeriesChart

Линейный график исторических метрик во времени.

```jsx
<TimeSeriesChart metric="cpu" level={1} />
```

#### Timeline

Интерактивная временная шкала с масштабированием и детализацией.

```jsx
<Timeline />
```

#### SystemLoad

Визуализация средней нагрузки (1m, 5m, 15m).

```jsx
<SystemLoad />
```

#### Metrics3D

3D-визуализация системных метрик (требует three.js).

```jsx
<Metrics3D />
```

#### DiskMap

Визуализация использования диска по разделам.

```jsx
<DiskMap />
```

#### Sparkline

Компактный встроенный график для одной метрики.

```jsx
<Sparkline metric="cpu" />
```

### Хуки

#### useMetrics()

Получить текущий снимок метрик.

```ts
const metrics = useMetrics();
console.log(metrics.cpu, metrics.mem);
```

#### useHistory(level, range)

Получить исторические метрики за временной диапазон.

```ts
const history = useHistory(1, 3600); // L1, последний час
```

#### useRawPackets()

Подписаться на сырые пакеты протокола.

```ts
const packets = useRawPackets();
packets.forEach(pkt => console.log(pkt));
```

#### useTinyTrack()

Получить экземпляр клиента и состояние соединения.

```ts
const { client, connected } = useTinyTrack();
```

### Тема

#### useTheme()

Получить доступ к текущим токенам темы.

```ts
const theme = useTheme();
console.log(theme.colors.primary);
```

#### ThemeProvider

Обернуть приложение пользовательской темой.

```jsx
import { ThemeProvider, THEMES } from 'tinytsdk/react';

<ThemeProvider preset={THEMES.dark}>
  <App />
</ThemeProvider>
```

## Константы протокола

```ts
import {
  PROTO_MAGIC,
  PKT_METRICS,
  PKT_CONFIG,
  PKT_ACK,
  RING_L1,
  RING_L2,
  RING_L3,
  CMD_SET_INTERVAL,
  CMD_GET_SNAPSHOT,
  // ... ещё константы
} from 'tinytsdk';
```

## Размеры бандлов

| Бандл | Размер (gzip) | Использование |
|-------|---------------|---------------|
| `index.esm.js` | 2.8 KB | Только ядро клиента |
| `index.cjs.js` | 2.8 KB | Только ядро клиента (CommonJS) |
| `react.esm.js` | 23.7 KB | React-компоненты |
| `react.cjs.js` | 23.7 KB | React-компоненты (CommonJS) |
| `tinytsdk.min.js` | 2.8 KB | CDN (IIFE, только ядро) |

## Примеры

### Логирование метрик в консоль

```ts
import { TinyTrackClient } from 'tinytsdk';

const client = new TinyTrackClient('ws://localhost:25015');
client.on('metrics', (m) => {
  console.log(JSON.stringify(m, null, 2));
});
await client.connect();
```

### Экспорт в CSV

```ts
import { TinyTrackClient } from 'tinytsdk';
import * as fs from 'fs';

const client = new TinyTrackClient('ws://localhost:25015');
const stream = fs.createWriteStream('metrics.csv');

stream.write('timestamp,cpu,mem,load1\n');
client.on('metrics', (m) => {
  stream.write(`${m.timestamp},${m.cpu},${m.mem},${m.load1}\n`);
});

await client.connect();
```

### React-панель управления с пользовательским стилем

```jsx
import { TinyTrackProvider, Dashboard, ThemeProvider } from 'tinytsdk/react';

export default function App() {
  return (
    <ThemeProvider preset="dark">
      <TinyTrackProvider url="ws://localhost:25015">
        <div style={{ padding: '20px' }}>
          <h1>Системные метрики</h1>
          <Dashboard mode="expanded" />
        </div>
      </TinyTrackProvider>
    </ThemeProvider>
  );
}
```

## Решение проблем

### Соединение отказано

- Убедитесь, что сервер tinytrack запущен на указанном хосте:порте
- Проверьте правила брандмауэра, разрешающие WebSocket-соединения
- Проверьте формат URL: `ws://host:port` (не `http://`)

### Метрики не обновляются

- Проверьте консоль браузера на наличие ошибок
- Убедитесь, что сервер передаёт метрики (проверьте `tiny-cli metrics`)
- Убедитесь, что клиент подключен: `client.connected === true`

### Размер бандла слишком большой

- Используйте `tinytsdk-lite` только для ядра клиента (без React)
- Tree-shake неиспользуемые компоненты в вашем бандлере
- Используйте динамические импорты для тяжёлых компонентов, таких как Metrics3D

## Смотрите также

- [Документация сервера](./overview.md)
- [Архитектура](./architecture.md)
- [GitHub репозиторий](https://github.com/jetallavache/tinytrack)
